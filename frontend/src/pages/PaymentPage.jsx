import { useEffect, useMemo, useState } from "react";
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

export default function PaymentPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const [searchParams] = useSearchParams();
  const [tripDetails, setTripDetails] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [seats, setSeats] = useState(Number(searchParams.get("seats") || 1));
  const [pickupPointId, setPickupPointId] = useState(
    searchParams.get("pickupPointId") || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completingBookingId, setCompletingBookingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const tripId = searchParams.get("tripId");
  const loadBookings = async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      const response = await api.get("/bookings/my?page=1&limit=30", { cacheTtlMs: 20000 });
      setBookings(Array.isArray(response?.items) ? response.items : []);
    } catch {
      setBookings([]);
    }
  };

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
  }, [isLoggedIn, tripId]);

  useEffect(() => {
    if (!pickupPointId && tripDetails?.pickupPoints?.length) {
      setPickupPointId(tripDetails.pickupPoints[0]._id);
    }
  }, [pickupPointId, tripDetails]);

  const pickupOptions = useMemo(() => tripDetails?.pickupPoints || [], [tripDetails]);
  const trip = tripDetails;
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

    const result = await showConfirmAlert({
      title: "Confirm this booking?",
      text: `You are about to book ${seats} seat(s) for ${trip.title}.`,
      confirmButtonText: "Confirm Booking",
      icon: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMessage("");

      await api.post("/bookings", {
        tripId: trip._id,
        pickupPointId,
        seatsBooked: seats,
      });

      setSuccessMessage("Booking confirmed successfully.");
      await showSuccessAlert("Booking confirmed", "Your trip has been reserved.");
      await loadBookings();
    } catch (submitError) {
      setError(submitError.message);
      await showErrorAlert("Booking failed", submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markBookingCompleted = async (booking) => {
    const result = await showConfirmAlert({
      title: "Mark booking as completed?",
      text: "This enables review submission for this completed trip.",
      confirmButtonText: "Mark Completed",
      icon: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setCompletingBookingId(booking._id);
      setError("");
      setSuccessMessage("");
      await api.put(`/bookings/${booking._id}/complete`, {});
      setSuccessMessage("Booking marked as completed.");
      await showSuccessAlert(
        "Booking completed",
        "You can now submit a review for this booking.",
      );
      await loadBookings();
    } catch (completeError) {
      setError(completeError.message);
      await showErrorAlert("Could not complete booking", completeError.message);
    } finally {
      setCompletingBookingId("");
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              Booking Center
            </p>
            <h1 className="font-headline text-3xl font-extrabold text-primary sm:text-4xl">
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
          <div className="rounded-2xl bg-[#d8f5e5] p-4 text-sm font-semibold text-[#0f5132]">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Loading booking details..." />
        ) : null}

        {!isLoading && trip ? (
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.85fr]">
            <section className="rounded-3xl bg-surface-container-lowest p-5 shadow-xl sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                Selected Trip
              </p>
              <h2 className="mt-2 break-words font-headline text-3xl font-extrabold text-primary sm:text-4xl">
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
            </section>

            <aside className="rounded-3xl bg-primary p-5 text-white shadow-xl sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-container">
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
                disabled={isSubmitting || !pickupPointId || trip.availableSeats < 1}
                className="mt-6 w-full rounded-2xl bg-secondary px-5 py-4 font-headline text-lg font-extrabold text-[#2d2000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Confirming..." : "Confirm Booking"}
              </button>

              <p className="mt-4 text-xs text-white/75">
                No payment gateway is integrated here. This confirms the booking directly through the backend.
              </p>
            </aside>
          </div>
        ) : null}

        <section className="rounded-3xl bg-surface-container-lowest p-5 shadow-lg sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                Live Data
              </p>
              <h2 className="font-headline text-3xl font-extrabold text-primary">
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
                      <h3 className="font-headline text-2xl font-bold text-primary">
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
                      <p className="font-headline text-2xl font-black text-primary">
                        {formatINR(booking.totalAmount)}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                        {booking.status}
                      </p>
                      {booking.status === "confirmed" ? (
                        <button
                          onClick={() => markBookingCompleted(booking)}
                          disabled={completingBookingId === booking._id}
                          className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                        >
                          {completingBookingId === booking._id ? "Updating..." : "Mark Completed"}
                        </button>
                      ) : null}
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
    </MainLayout>
  );
}
