import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";
import { formatINR } from "../data/mockData";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const statusTone = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed") return "bg-[#858585] text-[#f94a4a]";
  if (s === "pending") return "bg-[#3d4466] text-[#f94a4a]";
  if (s === "cancelled") return "bg-error-container text-error";
  if (s === "completed") return "bg-[#e2e8fb] text-[#858585]";
  return "bg-surface-container-high text-on-surface-variant";
};

const paymentTone = (paymentStatus) => {
  const status = String(paymentStatus || "").toLowerCase();
  if (status === "paid") return "bg-[#858585] text-[#f94a4a]";
  if (status === "refund_required") return "bg-error-container text-error";
  if (status === "refunded") return "bg-[#e2e8fb] text-[#858585]";
  if (status === "failed") return "bg-error-container text-error";
  return "bg-surface-container-high text-on-surface-variant";
};

export default function OrganizerTripBuyersPage() {
  const { tripId } = useParams();
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [completingBookingId, setCompletingBookingId] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState("");
  const [refundingBookingId, setRefundingBookingId] = useState("");

  const loadBookings = useCallback(async () => {
    if (!tripId) return;
    try {
      setIsLoading(true);
      setError("");
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const response = await api.get(`/organizers/me/trips/${tripId}/bookings${query}`, {
        cacheTtlMs: 5000,
        forceRefresh: true,
      });
      setPayload(response);
    } catch (fetchError) {
      setError(fetchError.message);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const summary = payload?.summary || null;
  const trip = payload?.trip || null;
  const bookings = useMemo(() => (Array.isArray(payload?.bookings) ? payload.bookings : []), [payload]);

  const filled = summary ? safeNumber(summary.seatsFilled) : 0;
  const totalSeats = summary ? safeNumber(summary.totalSeats) : 0;
  const occupancy = totalSeats ? Math.min(100, Math.round((filled / totalSeats) * 100)) : 0;

  const completeBooking = async (bookingId) => {
    const result = await showConfirmAlert({
      title: "Mark booking as completed?",
      text: "This will move this traveler's booking to completed.",
      confirmButtonText: "Mark Completed",
      icon: "warning",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      setCompletingBookingId(bookingId);
      setError("");
      await api.put(`/bookings/${bookingId}/complete`, {});
      await showSuccessAlert("Booking completed", "Traveler booking is now marked as completed.");
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not complete booking", requestError.message);
    } finally {
      setCompletingBookingId("");
    }
  };

  const cancelBookingByOrganizer = async (bookingId) => {
    const result = await showConfirmAlert({
      title: "Cancel this booking?",
      text: "Confirmed paid bookings will move to refund-required status.",
      confirmButtonText: "Cancel Booking",
      icon: "warning",
    });
    if (!result.isConfirmed) return;

    try {
      setCancellingBookingId(bookingId);
      setError("");
      await api.put(`/bookings/${bookingId}/organizer-cancel`, {});
      await showSuccessAlert("Booking cancelled", "Traveler booking is cancelled.");
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not cancel booking", requestError.message);
    } finally {
      setCancellingBookingId("");
    }
  };

  const markRefunded = async (bookingId) => {
    const result = await showConfirmAlert({
      title: "Mark refund as completed?",
      text: "Use this after payment team confirms the refund transfer.",
      confirmButtonText: "Mark Refunded",
      icon: "warning",
    });
    if (!result.isConfirmed) return;

    try {
      setRefundingBookingId(bookingId);
      setError("");
      await api.put(`/bookings/${bookingId}/mark-refunded`, {});
      await showSuccessAlert("Refund marked", "Booking payment status is now refunded.");
      await loadBookings();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not mark refunded", requestError.message);
    } finally {
      setRefundingBookingId("");
    }
  };

  return (
    <MainLayout withFooter={false}>
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f94a4a]">
              Trip Buyers
            </p>
            <h1 className="mt-1 font-manrope text-2xl font-extrabold text-primary">
              {trip?.title || "Trip details"}
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              {trip ? `${trip.source} → ${trip.destination}` : " "}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/organizer/trips"
              className="rounded-2xl bg-surface-container-low px-5 py-3 text-sm font-bold text-primary hover:bg-surface-container-high"
            >
              Back to My Trips
            </Link>
            <Link
              to={`/chat?room=${encodeURIComponent(`trip_${tripId}`)}`}
              className="rounded-2xl border border-primary/20 px-5 py-3 text-sm font-bold text-primary hover:bg-primary hover:text-white"
            >
              Open Trip Chat
            </Link>
            <Link
              to={`/trips/${tripId}`}
              className="rounded-2xl border border-primary/15 px-5 py-3 text-sm font-bold text-primary hover:bg-primary hover:text-white"
            >
              Open Public Trip Page
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {isLoading ? <LoadingPanel label="Loading buyers..." variant="list" /> : null}

        {!isLoading && payload && summary ? (
          <section className="grid gap-4 lg:grid-cols-12">
            <article className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm lg:col-span-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">
                Occupancy
              </p>
              <p className="mt-2 font-manrope text-3xl font-black text-primary">
                {occupancy}%
              </p>
              <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                {filled}/{totalSeats} seats filled
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-linear-to-r from-secondary to-secondary-container"
                  style={{ width: `${occupancy}%` }}
                />
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">
                    Bookings
                  </p>
                  <p className="mt-2 font-manrope text-xl font-black text-primary">
                    {safeNumber(summary.bookingsCount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                    Revenue (paid)
                  </p>
                  <p className="mt-2 font-manrope text-xl font-black">
                    {formatINR(safeNumber(summary.revenueTotal))}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">
                    Refund Queue
                  </p>
                  <p className="mt-2 font-manrope text-xl font-black text-primary">
                    {safeNumber(summary?.paymentBreakdown?.refund_required)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">
                    Refunded
                  </p>
                  <p className="mt-2 font-manrope text-xl font-black text-primary">
                    {safeNumber(summary?.paymentBreakdown?.refunded)}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-manrope text-xl font-extrabold text-primary">
                    Buyers & Bookings
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Names and contact details of travelers who booked this trip.
                  </p>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary"
                >
                  <option value="">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-outline-variant/20">
                <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr] gap-3 bg-surface-container-low px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-outline">
                  <span>Traveler</span>
                  <span>Contact</span>
                  <span>Seats</span>
                  <span>Payment</span>
                </div>

                {bookings.length ? (
                  bookings.map((booking) => {
                    const traveler = booking?.travelerId || {};
                    const paymentLabel =
                      booking?.paymentStatus === "paid"
                        ? "Paid"
                        : String(booking?.paymentStatus || "created");
                    const bookingStatus = String(booking?.status || "pending");
                    const pickupLabel = booking?.pickupPointId?.location
                      ? `${booking.pickupPointId.location} (${booking.pickupPointId.time || "TBD"})`
                      : "—";

                    return (
                      <div
                        key={String(booking._id)}
                        className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr] gap-3 border-t border-outline-variant/20 bg-surface-container px-4 py-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-manrope text-base font-extrabold text-primary">
                              {traveler.name || "Traveler"}
                            </p>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(bookingStatus)}`}>
                              {bookingStatus}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-outline">
                            Pickup: {pickupLabel}
                          </p>
                          <p className="mt-1 text-xs text-outline">
                            Booked: {formatDateTime(booking.createdAt)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface-variant">
                            {traveler.email || "—"}
                          </p>
                          <p className="mt-1 truncate text-sm text-on-surface-variant">
                            {traveler.phone || "—"}
                          </p>
                          <p className="mt-1 text-xs text-outline">
                            Trust: {safeNumber(traveler.trustScore)} • {traveler.verificationStatus || "unverified"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-black text-primary">
                            {safeNumber(booking.seatsBooked, 1)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-primary">
                            {formatINR(safeNumber(booking.totalAmount))}
                          </p>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#f94a4a]">
                            <span className={`rounded-full px-2 py-0.5 ${paymentTone(booking?.paymentStatus)}`}>
                              {paymentLabel}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-outline">
                            {booking.paymentCapturedAt ? formatDateTime(booking.paymentCapturedAt) : "—"}
                          </p>
                          {bookingStatus !== "cancelled" && bookingStatus !== "completed" ? (
                            <button
                              type="button"
                              onClick={() => cancelBookingByOrganizer(String(booking._id))}
                              disabled={cancellingBookingId === String(booking._id)}
                              className="mt-2 rounded-lg bg-error-container px-3 py-2 text-[10px] font-black uppercase text-error disabled:opacity-60"
                            >
                              {cancellingBookingId === String(booking._id) ? "Updating..." : "Cancel Booking"}
                            </button>
                          ) : null}
                          {String(booking?.paymentStatus) === "refund_required" ? (
                            <button
                              type="button"
                              onClick={() => markRefunded(String(booking._id))}
                              disabled={refundingBookingId === String(booking._id)}
                              className="mt-2 rounded-lg bg-surface-container px-3 py-2 text-[10px] font-black uppercase text-on-surface-variant disabled:opacity-60"
                            >
                              {refundingBookingId === String(booking._id) ? "Updating..." : "Mark Refunded"}
                            </button>
                          ) : null}
                          {bookingStatus === "confirmed" ? (
                            <button
                              type="button"
                              onClick={() => completeBooking(String(booking._id))}
                              disabled={completingBookingId === String(booking._id)}
                              className="mt-2 rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-60"
                            >
                              {completingBookingId === String(booking._id) ? "Updating..." : "Mark Completed"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-surface-container p-10 text-center text-on-surface-variant">
                    No bookings found for this trip.
                  </div>
                )}
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </MainLayout>
  );
}


