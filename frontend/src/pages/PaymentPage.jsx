import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";

const getOrganizerUserId = (booking) => {
  const organizer = booking?.tripId?.organizerId;
  const userId = organizer?.userId;
  return userId?._id || userId || organizer?._id || organizer || null;
};

const isBookingFeedbackReady = (booking) => {
  const status = String(booking?.status || "").toLowerCase();
  if (status === "completed") {
    return true;
  }
  if (status !== "confirmed") {
    return false;
  }

  const endDate = new Date(booking?.tripId?.endDate || 0);
  return Number.isFinite(endDate.getTime()) && endDate < new Date();
};

const isBookingTestCompletable = (booking) => {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.paymentStatus || "").toLowerCase();
  return status === "confirmed" && paymentStatus === "paid";
};

export default function PaymentPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const isTestFinishEnabled =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_FINISH_TRIP === "true";
  const [searchParams] = useSearchParams();
  const [tripDetails, setTripDetails] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [seats, setSeats] = useState(Number(searchParams.get("seats") || 1));
  const [pickupPointId, setPickupPointId] = useState(
    searchParams.get("pickupPointId") || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [finishingBookingId, setFinishingBookingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRazorpayReady, setIsRazorpayReady] = useState(Boolean(window.Razorpay));

  const tripId = searchParams.get("tripId");
  useEffect(() => {
    if (window.Razorpay) {
      setIsRazorpayReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsRazorpayReady(true);
    script.onerror = () => setError("Could not load payment gateway. Please refresh and try again.");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const loadBookings = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!isLoggedIn) {
      return;
    }

    try {
      const response = await api.get("/bookings/my?page=1&limit=30", {
        cacheTtlMs: 20000,
        forceRefresh,
      });
      setBookings(Array.isArray(response?.items) ? response.items : []);
    } catch {
      setBookings([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const loadPage = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const requests = [loadBookings()];
        if (tripId) {
          requests.push(
            api.get(`/trips/${tripId}`).then((response) => {
              setTripDetails(response);
            }),
          );
        } else {
          setTripDetails(null);
        }

        await Promise.all(requests);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [isLoggedIn, loadBookings, tripId]);

  useEffect(() => {
    if (!pickupPointId && tripDetails?.pickupPoints?.length) {
      setPickupPointId(tripDetails.pickupPoints[0]._id);
    }
  }, [pickupPointId, tripDetails]);

  const pickupOptions = useMemo(() => tripDetails?.pickupPoints || [], [tripDetails]);
  const trip = tripDetails;
  const isDeparted = useMemo(() => {
    return trip?.startDate && new Date(trip.startDate) < new Date();
  }, [trip]);
  const subtotal = (trip?.pricePerPerson || 0) * seats;
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;

  const selectedPickupPoint = useMemo(
    () => pickupOptions.find((point) => point._id === pickupPointId),
    [pickupOptions, pickupPointId],
  );

  const submitBooking = async () => {
    if (!trip || !pickupPointId) {
      setError("Please select a trip and pickup point.");
      await showErrorAlert("Booking incomplete", "Please select a trip and pickup point.");
      return;
    }
    if (isDeparted) {
      const message = "This trip has already departed and can no longer be booked.";
      setError(message);
      await showErrorAlert("Booking closed", message);
      return;
    }
    if (!isRazorpayReady || !window.Razorpay) {
      const message = "Payment gateway is still loading. Please wait a moment and try again.";
      setError(message);
      await showErrorAlert("Payment unavailable", message);
      return;
    }

    const result = await showConfirmAlert({
      title: "Proceed to payment?",
      text: `You are about to pay ${formatINR(total)} for ${seats} seat(s) in ${trip.title}.`,
      confirmButtonText: "Pay Now",
      icon: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");
      let postPaymentNotice = "";

      const paymentOrder = await api.post("/bookings/initiate-payment", {
        tripId: trip._id,
        pickupPointId,
        seatsBooked: seats,
      });

      if (!paymentOrder?.orderId || !paymentOrder?.keyId || !paymentOrder?.bookingId) {
        throw new Error("Payment order response is incomplete");
      }

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: paymentOrder.keyId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency || "INR",
          name: "BagPacker",
          description: `${trip.title} (${seats} seat${seats > 1 ? "s" : ""})`,
          order_id: paymentOrder.orderId,
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          notes: {
            bookingId: paymentOrder.bookingId,
            tripId: trip._id,
          },
          theme: {
            color: "#858585",
          },
          handler: async (response) => {
            try {
              const verificationResponse = await api.post("/bookings/verify-payment", {
                bookingId: paymentOrder.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              const emailDelivery = verificationResponse?.emailDelivery;
              postPaymentNotice =
                emailDelivery?.delivered
                  ? "Booking confirmed and e-ticket sent to your email."
                  : `Booking confirmed. E-ticket email not sent${emailDelivery?.reason ? `: ${emailDelivery.reason}` : "."}`;
              setSuccessMessage(postPaymentNotice);
              resolve();
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
        });

        razorpay.on("payment.failed", (failedResponse) => {
          const reason =
            failedResponse?.error?.description ||
            failedResponse?.error?.reason ||
            "Payment failed";
          reject(new Error(reason));
        });

        razorpay.open();
      });

      if (!postPaymentNotice) {
        setSuccessMessage("Payment successful and booking confirmed.");
      }
      await showSuccessAlert("Payment successful", "Your trip booking is confirmed.");
      await loadBookings({ forceRefresh: true });
    } catch (submitError) {
      setError(submitError.message);
      await showErrorAlert("Booking failed", submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishBookingForTesting = async (booking) => {
    const result = await showConfirmAlert({
      title: "Finish trip for testing?",
      text: "This marks your booking as completed so the feedback form becomes available.",
      confirmButtonText: "Finish Trip",
      tone: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setFinishingBookingId(booking._id);
      setError("");
      await api.put(`/bookings/${booking._id}/test-complete`, {});
      await loadBookings({ forceRefresh: true });
      await showSuccessAlert("Trip finished", "You can now leave feedback for this booking.");
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not finish trip", requestError.message);
    } finally {
      setFinishingBookingId("");
    }
  };

  const submitReview = async () => {
    if (!selectedBookingForReview) {
      return;
    }

    try {
      setIsReviewSubmitting(true);
      setError("");
      const revieweeId = getOrganizerUserId(selectedBookingForReview);
      if (!revieweeId) {
        throw new Error("Organizer details are still loading. Please refresh and try again.");
      }

      await api.post("/reviews", {
        bookingId: selectedBookingForReview._id,
        revieweeId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });

      setSelectedBookingForReview(null);
      setReviewForm({ rating: 5, comment: "" });
      await showSuccessAlert("Feedback submitted", "Thank you for sharing your trip experience.");
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not submit feedback", requestError.message);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="rounded-2xl bg-error-container p-6 text-center text-on-error-container">
            Please <Link to="/auth?mode=login" className="font-bold underline">login</Link> to continue with bookings.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-12">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f94a4a]">
              Booking Center
            </p>
            <h1 className="font-manrope text-xl font-extrabold text-primary sm:text-2xl">
              {user?.name ? `${user.name.split(" ")[0]}, finalize your trip` : "Finalize your trip"}
            </h1>
          </div>
          <Link
            to="/dashboard/traveler"
            className="rounded-xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary"
          >
            View My Dashboard
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl bg-[#d6f0e4] p-4 text-sm font-semibold text-[#0f4a2c]">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? <LoadingPanel label="Loading booking details..." variant="page" /> : null}

        {!isLoading && trip ? (
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
            <section className="rounded-xl bg-surface-container-lowest p-5 shadow-xl sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                Selected Trip
              </p>
              <h2 className="mt-2 break-words font-manrope text-xl font-extrabold text-primary sm:text-2xl">
                {trip.title}
              </h2>
              <div className="mt-4 grid gap-4 text-sm text-on-surface-variant lg:grid-cols-2">
                <p>{trip.source} to {trip.destination}</p>
                <p>{new Date(trip.startDate).toLocaleDateString("en-IN")} to {new Date(trip.endDate).toLocaleDateString("en-IN")}</p>
                <p>{trip.availableSeats} seats currently available</p>
                <p>{trip.organizerId?.businessName || "Organizer"}</p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                    Seats
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, trip.availableSeats)}
                    value={seats}
                    onChange={(event) =>
                      setSeats(
                        Math.min(
                          Math.max(1, Number(event.target.value || 1)),
                          Math.max(1, trip.availableSeats),
                        ),
                      )
                    }
                    className="rounded-xl bg-surface-container-low px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                    Pickup Point
                  </span>
                  <select
                    value={pickupPointId}
                    onChange={(event) => setPickupPointId(event.target.value)}
                    className="rounded-xl bg-surface-container-low px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {pickupOptions.map((point) => (
                      <option key={point._id} value={point._id}>
                        {point.location} ({point.time})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedPickupPoint ? (
                <div className="mt-6 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  Pickup selected: <span className="font-bold text-primary">{selectedPickupPoint.location}</span> at{" "}
                  <span className="font-bold text-primary">{selectedPickupPoint.time}</span>
                </div>
              ) : null}

              {isDeparted ? (
                <div className="mt-6 rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">
                  Warning: This trip departed on {new Date(trip.startDate).toLocaleDateString("en-IN")}. Bookings are closed.
                </div>
              ) : null}
            </section>

            <aside className="rounded-xl bg-primary p-5 text-white shadow-xl sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f94a4a]">
                Booking Summary
              </p>
              <div className="mt-6 space-y-4 border-b border-white/10 pb-6 text-sm">
                <div className="flex justify-between">
                  <span>Fare ({seats} seats)</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span>{formatINR(taxes)}</span>
                </div>
                <div className="flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>

              <button
                onClick={submitBooking}
                disabled={
                  isSubmitting || !pickupPointId || trip.availableSeats < 1 || !isRazorpayReady || isDeparted
                }
                className="mt-6 w-full rounded-2xl bg-secondary px-5 py-4 font-manrope text-lg font-extrabold text-[#2d2000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Processing..."
                  : !isRazorpayReady
                    ? "Loading Payment..."
                    : isDeparted
                      ? "Trip Departed"
                      : "Pay & Confirm Booking"}
              </button>

              <p className="mt-4 text-xs text-white/75">
                Secure payment via Razorpay. Booking is confirmed only after successful payment.
              </p>
            </aside>
          </div>
        ) : null}

        <section className="rounded-xl bg-surface-container-lowest p-5 shadow-lg sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                Live Data
              </p>
              <h2 className="font-manrope text-xl font-extrabold text-primary">
                My Bookings
              </h2>
            </div>
            <Link
              to="/trips/search"
              className="rounded-xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary"
            >
              Explore More Trips
            </Link>
          </div>

          {bookings.length ? (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <article
                  key={booking._id}
                  className="rounded-2xl bg-surface-container-low p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="font-manrope text-lg font-bold text-primary">
                        {booking.tripId?.title || "Trip"}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {booking.tripId?.source} to {booking.tripId?.destination}
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Pickup: {booking.pickupPointId?.location || "N/A"} | Seats: {booking.seatsBooked}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-manrope text-lg font-black text-primary">
                        {formatINR(booking.totalAmount)}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f94a4a]">
                        {booking.status}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 lg:justify-end">
                        {isBookingFeedbackReady(booking) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForReview(booking)}
                            className="rounded-xl bg-secondary px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#2d2000]"
                          >
                            Leave Feedback
                          </button>
                        ) : null}
                        {isTestFinishEnabled && isBookingTestCompletable(booking) ? (
                          <button
                            type="button"
                            onClick={() => finishBookingForTesting(booking)}
                            disabled={finishingBookingId === booking._id}
                            className="rounded-xl bg-surface-container-high px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {finishingBookingId === booking._id ? "Finishing..." : "Finish Trip (Test)"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
              No bookings yet.
            </div>
          )}
        </section>
      </div>

      {selectedBookingForReview ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-outline">
                  Trip Feedback
                </p>
                <h2 className="mt-1 font-manrope text-xl font-extrabold text-primary">
                  {selectedBookingForReview.tripId?.title || "Your trip"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForReview(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-outline">
                  Rating
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                        star <= reviewForm.rating
                          ? "bg-secondary text-[#2d2000]"
                          : "bg-surface-container-low text-outline"
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {star <= reviewForm.rating ? "star" : "star_outline"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-outline">
                  Feedback
                </span>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, comment: event.target.value }))
                  }
                  rows={4}
                  placeholder="How was the coordination, safety, and overall experience?"
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-sm text-on-surface outline-none transition focus:border-primary/40"
                />
              </label>

              <button
                type="button"
                onClick={submitReview}
                disabled={isReviewSubmitting}
                className="w-full rounded-2xl bg-primary px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReviewSubmitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}

