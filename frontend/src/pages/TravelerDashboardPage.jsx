import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";
import { setUser } from "../store/authSlice";

const formatDateLabel = (value) => {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "TBD"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTimeLabel = (value) => {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "TBD"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const getTicketCode = (booking) => {
  const bookingKey = String(booking?._id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const routeKey = `${String(booking?.tripId?.source || "").slice(0, 2)}${String(
    booking?.tripId?.destination || "",
  ).slice(0, 2)}`.replace(/[^a-zA-Z0-9]/g, "");
  const datePart = formatDateLabel(booking?.tripId?.startDate).replace(/\s/g, "").toUpperCase();
  return `BP-${routeKey || "TRIP"}-${datePart || "DATE"}-${bookingKey.slice(-6) || "000000"}`;
};

export default function TravelerDashboardPage() {
  const dispatch = useDispatch();
  const storedUser = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const isLoggedIn = Boolean(token);
  const [profile, setProfile] = useState(storedUser);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [companionRequests, setCompanionRequests] = useState({ sent: [], received: [] });
  const [notifications, setNotifications] = useState([]);
  const [recommendedTrips, setRecommendedTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const [userProfile, userBookings, companions, trips, userNotifications] = await Promise.all([
          api.get("/users/profile"),
          api.get("/bookings/my?page=1&limit=12", { cacheTtlMs: 30000 }),
          api.get("/companions/my?page=1&limit=30", { cacheTtlMs: 30000 }),
          api.get("/trips?page=1&limit=8", { cacheTtlMs: 45000 }),
          api.get("/notifications?page=1&limit=12", { cacheTtlMs: 15000 }),
        ]);

        setProfile(userProfile);
        dispatch(setUser(userProfile));
        setBookings(Array.isArray(userBookings?.items) ? userBookings.items : []);
        setCompanionRequests(companions || { sent: [], received: [] });
        setRecommendedTrips(Array.isArray(trips?.items) ? trips.items.slice(0, 3) : []);
        setNotifications(Array.isArray(userNotifications?.items) ? userNotifications.items : []);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [dispatch, isLoggedIn]);

  useEffect(() => {
    setProfile(storedUser);
  }, [storedUser]);

  const stats = useMemo(
    () => [
      ["Upcoming Bookings", bookings.filter((item) => item.status === "confirmed").length, "event_available"],
      [
        "Companion Requests",
        (companionRequests.sent?.length || 0) + (companionRequests.received?.length || 0),
        "person_add",
      ],
      ["Trust Score", profile?.trustScore ?? 0, "verified_user"],
    ],
    [bookings, companionRequests, profile],
  );
  const confirmedTickets = useMemo(
    () =>
      bookings
        .filter((item) => item.status === "confirmed")
        .sort((first, second) => {
          const firstDate = new Date(first?.tripId?.startDate || 0).getTime();
          const secondDate = new Date(second?.tripId?.startDate || 0).getTime();
          return firstDate - secondDate;
        }),
    [bookings],
  );

  const markNotificationRead = async (notificationId) => {
    try {
      setError("");
      await api.put(`/notifications/${notificationId}/read`, {});
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      setError("");
      // Using Promise.all to mark all unread as read if there is no bulk endpoint
      // Assuming api.put(`/notifications/read-all`, {}) exists or just looping
      const unread = notifications.filter((n) => !n.isRead);
      if (unread.length === 0) return;

      await Promise.all(unread.map((n) => api.put(`/notifications/${n._id}/read`, {})));

      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitReview = async () => {
    if (!selectedBookingForReview) return;
    try {
      setIsReviewSubmitting(true);
      await api.post("/reviews", {
        bookingId: selectedBookingForReview._id,
        revieweeId: selectedBookingForReview.tripId?.organizerId?.userId || selectedBookingForReview.tripId?.organizerId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      await showSuccessAlert("Thank You!", "Your review has been submitted.");
      setSelectedBookingForReview(null);
      setReviewForm({ rating: 5, comment: "" });
    } catch (err) {
      console.error("Failed to submit review:", err);
      showErrorAlert("Submission failed", err.message);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead);
    const read = notifications.filter((n) => n.isRead);

    const messageGroups = new Map();
    const uniqueUnread = [];

    unread.forEach((n) => {
      const key = n.message;
      if (messageGroups.has(key)) {
        messageGroups.get(key).count += 1;
      } else {
        const groupObj = { ...n, count: 1 };
        messageGroups.set(key, groupObj);
        uniqueUnread.push(groupObj);
      }
    });

    return [...uniqueUnread, ...read];
  }, [notifications]);

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access your traveler dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        {/* ── Sidebar ── */}
        <aside className="hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low md:flex">
          {/* User Profile */}
          <div className="p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {profile?.name?.charAt(0) || "T"}
            </div>
            <h2 className="mt-4 font-manrope text-xl font-extrabold text-primary">
              {profile?.name || "Traveler"}
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-outline">Traveler</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === "overview"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
              Overview
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === "bookings"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">event_note</span>
                My Bookings
              </div>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                {bookings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === "tickets"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">confirmation_number</span>
                E-Tickets
              </div>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                {confirmedTickets.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === "notifications"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">notifications</span>
                Notifications
              </div>
              <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === "recommendations"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">grade</span>
                For You
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {recommendedTrips.length}
              </span>
            </button>
          </nav>

          {/* Bottom Stats */}
          <div className="grid grid-cols-3 border-t border-outline-variant/20 py-6 text-center">
            <div>
              <p className="text-lg font-extrabold text-primary">{bookings.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Total</p>
            </div>
            <div className="border-x border-outline-variant/20">
              <p className="text-lg font-extrabold text-primary">
                {bookings.filter((b) => b.status === "confirmed").length}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Upcoming</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-primary">
                {bookings.filter((b) => b.status !== "confirmed").length}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Pending</p>
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-12">
          {error ? (
            <div className="mb-6 rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <LoadingPanel label="Loading dashboard..." variant="grid" />
          ) : (
            <div className="max-w-4xl space-y-12">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-6">
                <h1 className="font-manrope text-2xl font-extrabold capitalize tracking-tight text-primary">
                  {activeTab.replace("_", " ")}
                </h1>
                <Link
                  to="/trips/search"
                  className="rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-bold text-primary hover:bg-surface-container-highest"
                >
                  Explore Trips
                </Link>
              </div>

              {/* View Rendering Logic */}
              {activeTab === "overview" && (
                <>
                  {/* Upcoming Trips Section */}
                  <section>
                    <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      Upcoming trips
                    </h3>
                    <div className="space-y-4">
                      {bookings.length > 0 ? (
                        bookings.slice(0, 3).map((booking) => (
                          <article
                            key={booking._id}
                            className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5 transition hover:bg-surface-container-highest"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex items-center gap-3">
                                  <h4 className="font-bold text-primary">
                                    {booking.tripId?.title}
                                  </h4>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                      booking.status === "confirmed"
                                        ? "bg-success-container text-on-success-container"
                                        : "bg-warning-container text-on-warning-container"
                                    }`}
                                  >
                                    {booking.status}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
                                  <span>{booking.tripId?.source}</span>
                                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                  <span>{booking.tripId?.destination}</span>
                                </div>
                                <p className="mt-2 text-xs font-medium text-outline">
                                  {formatDateLabel(booking.tripId?.startDate)} -{" "}
                                  {formatDateLabel(booking.tripId?.endDate)}
                                </p>
                              </div>
                              <div className="text-right border-t border-outline-variant/20 pt-4 sm:border-none sm:pt-0">
                                <p className="font-headline text-xl font-black text-primary">
                                  {formatINR(booking.totalAmount)}
                                </p>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-outline-variant/50 p-12 text-center text-on-surface-variant">
                          No active bookings found.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Recent Notifications Section */}
                  <section>
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Recent notifications
                      </h3>
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-outline-variant/10 rounded-2xl bg-surface-container-low px-5">
                      {groupedNotifications.slice(0, 3).map((notification) => (
                        <article key={notification._id} className="flex items-start gap-4 py-5">
                          <div
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.isRead ? "bg-outline-variant" : "bg-secondary"
                            }`}
                          />
                          <div className="flex-1">
                            <p
                              className={`text-sm ${
                                notification.isRead ? "text-on-surface-variant" : "font-bold text-primary"
                              }`}
                            >
                              {notification.message}
                              {notification.count > 1 && (
                                <span className="ml-2 rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">
                                  {notification.count} similar
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-[10px] text-outline">
                              {formatDateTimeLabel(notification.createdAt)}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {activeTab === "bookings" && (
                <section className="space-y-4">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      All Bookings ({bookings.length})
                    </h3>
                  </div>
                  <div className="grid gap-4">
                    {bookings.map((booking) => (
                      <article
                        key={`all-bookings-${booking._id}`}
                        className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6 transition hover:bg-surface-container-highest"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-manrope text-lg font-extrabold text-primary">
                                {booking.tripId?.title}
                              </h4>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  booking.status === "confirmed"
                                    ? new Date(booking.tripId?.endDate) < new Date()
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : "bg-success-container text-on-success-container"
                                    : "bg-warning-container text-on-warning-container"
                                }`}
                              >
                                {booking.status === "confirmed" && new Date(booking.tripId?.endDate) < new Date()
                                  ? "Completed"
                                  : booking.status}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 font-medium text-primary/80">
                              <span>{booking.tripId?.source}</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                              <span>{booking.tripId?.destination}</span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-outline">
                              Trip Date: {formatDateLabel(booking.tripId?.startDate)} -{" "}
                              {formatDateLabel(booking.tripId?.endDate)}
                            </p>
                            <p className="mt-1 text-[11px] text-on-surface-variant">
                              Booked on: {formatDateLabel(booking.createdAt)}
                            </p>
                          </div>
                          <div className="text-right border-t border-outline-variant/20 pt-4 sm:border-none sm:pt-0">
                            {booking.status === "confirmed" && new Date(booking.tripId?.endDate) < new Date() ? (
                              <button
                                onClick={() => setSelectedBookingForReview(booking)}
                                className="rounded-xl bg-secondary px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(127,161,28,0.3)] transition hover:brightness-110 active:scale-95"
                              >
                                Leave Review
                              </button>
                            ) : (
                              <>
                                <p className="font-headline text-2xl font-black text-primary">
                                  {formatINR(booking.totalAmount)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-outline">
                                  {booking.seatsBooked} Seats
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                    {bookings.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-outline-variant/50 p-20 text-center text-on-surface-variant">
                        You haven't booked any trips yet.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "tickets" && (
                <section className="space-y-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      Your E-Tickets ({confirmedTickets.length})
                    </h3>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    {confirmedTickets.map((booking) => {
                      const ticketCode = getTicketCode(booking);
                      return (
                        <article
                          key={`tab-ticket-${booking._id}`}
                          className="relative overflow-hidden rounded-2xl border border-surface-variant/30 bg-white p-6 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-manrope text-lg font-extrabold text-on-surface">
                                {booking.tripId?.title}
                              </h4>
                              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-primary">
                                <span>{booking.tripId?.source}</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                <span>{booking.tripId?.destination}</span>
                              </div>
                            </div>
                            <div className="rounded-full bg-success-container px-3 py-1 text-[10px] font-black uppercase tracking-wider text-on-success-container">
                              Confirmed
                            </div>
                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-outline-variant/20 py-4">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-outline">
                                Traveler
                              </span>
                              <p className="text-sm font-bold text-on-surface">{profile?.name}</p>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-outline">
                                Ticket ID
                              </span>
                              <p className="font-mono text-xs font-bold text-on-surface">{ticketCode}</p>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-outline">
                                Pickup
                              </span>
                              <p className="text-xs font-bold text-on-surface">
                                {booking.pickupPointId?.location || "TBD"}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-outline">
                                Paid
                              </span>
                              <p className="text-xs font-bold text-on-surface">
                                {formatINR(booking.totalAmount)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <p className="text-[10px] font-medium text-outline">
                              Issued: {formatDateTimeLabel(booking.createdAt)}
                            </p>
                            <button className="text-xs font-bold text-primary hover:underline">
                              Download PDF
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {confirmedTickets.length === 0 && (
                      <div className="col-span-full rounded-2xl border border-dashed border-outline-variant/50 p-20 text-center text-on-surface-variant">
                        No e-tickets available. Confirm a booking to see your tickets here.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "notifications" && (
                <section className="space-y-4">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      All Notifications ({notifications.length})
                    </h3>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-outline-variant/10 rounded-2xl bg-surface-container-low px-6">
                    {notifications.map((notification) => (
                      <article key={`all-notif-${notification._id}`} className="flex items-start gap-5 py-6">
                        <div
                          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                            notification.isRead ? "bg-outline-variant" : "bg-secondary shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]"
                          }`}
                        />
                        <div className="flex-1">
                          <p className={`text-base ${notification.isRead ? "text-on-surface-variant" : "font-bold text-primary"}`}>
                            {notification.message}
                          </p>
                          <p className="mt-1.5 text-xs text-outline">
                            {formatDateTimeLabel(notification.createdAt)}
                          </p>
                        </div>
                      </article>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-20 text-center text-on-surface-variant">
                        Your notification tray is empty.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeTab === "recommendations" && (
                <section className="space-y-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                      Recommended Trips
                    </h3>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {recommendedTrips.map((trip) => (
                      <article
                        key={`rec-trip-${trip._id}`}
                        className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low transition hover:bg-surface-container-highest"
                      >
                        <div className="p-6">
                          <h4 className="font-manrope text-lg font-extrabold text-primary">
                            {trip.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-on-surface-variant">
                            <span>{trip.source}</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            <span>{trip.destination}</span>
                          </div>
                          <p className="mt-4 text-xs text-outline">
                            {trip.availableSeats} seats left for this expedition
                          </p>
                          <div className="mt-6 flex items-center justify-between border-t border-outline-variant/20 pt-4">
                            <p className="font-manrope text-xl font-black text-primary">
                              {formatINR(trip.pricePerPerson)}
                            </p>
                            <Link
                              to={`/trips/${trip._id}`}
                              className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm"
                            >
                              Explore
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Review Modal */}
      {selectedBookingForReview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-surface p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <h2 className="font-manrope text-xl font-extrabold text-primary">
                Rate the Organizer: {selectedBookingForReview.tripId?.organizerId?.businessName || "Service Provider"}
              </h2>
              <button
                onClick={() => setSelectedBookingForReview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-primary"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <p className="text-sm text-on-surface-variant">
                Your feedback helps the community choose trusted organizers and helps this provider grow.
              </p>
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-widest text-outline">
                  Organizer Rating
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
                        star <= reviewForm.rating
                          ? "bg-secondary text-white shadow-lg"
                          : "bg-surface-container-highest text-outline hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {star <= reviewForm.rating ? "star" : "star_outline"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-widest text-outline">
                  Your Comment
                </p>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                  rows={4}
                  placeholder="Share your experience with the group and the organizer..."
                  className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-sm font-medium text-primary outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={submitReview}
                disabled={isReviewSubmitting}
                className="w-full rounded-2xl bg-primary py-4 font-manrope text-lg font-black text-white shadow-xl transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isReviewSubmitting ? "Submitting..." : "Post Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

