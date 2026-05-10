import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";
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

const getOrganizerUserId = (booking) => {
  const organizer = booking?.tripId?.organizerId;
  const userId = organizer?.userId;
  return userId?._id || userId || organizer?._id || organizer || null;
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
      <MainLayout hideFooterOnMobile={true}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access your traveler dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideFooterOnMobile={true}>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        {/* ── Sidebar ── */}
        <aside className="hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low md:flex">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[1.6rem]">dashboard</span>
              </div>
              <div>
                <h2 className="font-headline text-sm font-black uppercase tracking-[0.1em] text-primary">
                  Traveler <span className="text-secondary">Hub</span>
                </h2>
                <p className="text-[10px] font-bold text-on-surface-variant/60">Manage your trips</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 pt-4">
            {[
              ["overview", "Overview", "grid_view"],
              ["bookings", "My Bookings", "event_note"],
              ["tickets", "E-Tickets", "confirmation_number"],
              ["notifications", "Notifications", "notifications"],
              ["recommendations", "For You", "grade"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  activeTab === key
                    ? "bg-primary text-on-primary shadow-[0_8px_16px_rgba(1,45,29,0.15)]"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="material-symbols-outlined text-[1.2rem]">{icon}</span>
                  {label}
                </div>
                {key === "notifications" && notifications.filter((n) => !n.isRead).length > 0 && (
                  <span className={`h-2 w-2 rounded-full ${activeTab === key ? "bg-on-primary" : "bg-error"}`} />
                )}
              </button>
            ))}
          </nav>

          <div className="mx-6 mb-8 rounded-2xl bg-surface-container-high/50 p-4 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary font-bold">
                {profile?.name?.charAt(0) || "T"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-on-surface">{profile?.name || "Traveler"}</p>
                <p className="text-[10px] text-on-surface-variant">Standard Account</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-outline-variant/10 pt-3">
              <div className="text-center">
                <p className="text-sm font-black text-primary">{bookings.length}</p>
                <p className="text-[8px] font-bold uppercase text-on-surface-variant/50">Trips</p>
              </div>
              <div className="text-center border-l border-outline-variant/10">
                <p className="text-sm font-black text-secondary">{profile?.trustScore || 0}</p>
                <p className="text-[8px] font-bold uppercase text-on-surface-variant/50">Trust</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface/80 backdrop-blur-xl md:hidden">
          <nav className="flex items-center justify-around px-2 py-3">
            {[
              ["overview", "grid_view", "Home"],
              ["bookings", "event_note", "Bookings"],
              ["tickets", "confirmation_number", "Pass"],
              ["notifications", "notifications", "Alerts"],
              ["recommendations", "grade", "For You"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative flex flex-col items-center gap-1 transition-all ${
                  activeTab === key ? "text-primary" : "text-on-surface-variant/40"
                }`}
              >
                <span className={`material-symbols-outlined text-[1.4rem] ${activeTab === key ? "font-bold" : ""}`}>
                  {icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                {key === "notifications" && notifications.filter((n) => !n.isRead).length > 0 && (
                  <span className="absolute top-0 right-0 -mr-1 h-3 w-3 rounded-full bg-secondary" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto px-4 py-10 pb-24 md:px-12 md:pb-10">
          <div className="mx-auto max-w-5xl space-y-10">
            {/* Header Section */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-on-surface capitalize">
                  {activeTab.replace("_", " ")} <span className="text-secondary">Console</span>
                </h1>
                <p className="mt-1 text-[11px] sm:text-sm text-on-surface-variant opacity-70">
                  {activeTab === "overview" && "Welcome back! Here's a snapshot of your travel activity."}
                  {activeTab === "bookings" && "Manage your upcoming and past travel reservations."}
                  {activeTab === "tickets" && "Quick access to your confirmed travel passes."}
                  {activeTab === "notifications" && "Stay updated with recent alerts and messages."}
                  {activeTab === "recommendations" && "Curated trips based on your interests."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/trips/search"
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
                >
                  <span className="material-symbols-outlined text-sm">explore</span>
                  Find Trips
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-[1.2rem]">refresh</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error-container p-4 text-sm font-bold text-error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-outline-variant/20 bg-surface">
                <LoadingPanel label="Connecting to travel network..." variant="grid" />
              </div>
            ) : (
              <div className="space-y-10">
                {/* ── Overview Tab ── */}
                {activeTab === "overview" && (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid gap-6 sm:grid-cols-3">
                      {stats.map(([label, value, icon]) => (
                        <article
                          key={label}
                          className="relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                                {label}
                              </p>
                              <p className="mt-3 font-headline text-3xl font-black text-on-surface">
                                {value}
                              </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                              <span className="material-symbols-outlined text-[1.4rem]">{icon}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                      {/* Upcoming Bookings */}
                      <section className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-headline text-lg font-black text-on-surface">
                            <span className="material-symbols-outlined text-primary">event_available</span>
                            Upcoming Trips
                          </h3>
                          <button onClick={() => setActiveTab("bookings")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                            View All
                          </button>
                        </div>
                        <div className="space-y-4">
                          {confirmedTickets.slice(0, 3).map((booking) => (
                            <div key={booking._id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 transition hover:bg-surface-container">
                              <div className="min-w-0">
                                <h4 className="truncate font-bold text-on-surface">{booking.tripId?.title}</h4>
                                <div className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
                                  <span>{booking.tripId?.source}</span>
                                  <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                  <span>{booking.tripId?.destination}</span>
                                </div>
                                <p className="mt-2 text-[10px] font-bold text-outline uppercase tracking-widest">
                                  {formatDateLabel(booking.tripId?.startDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-headline text-lg font-black text-primary">{formatINR(booking.totalAmount)}</p>
                                <span className="rounded-full bg-success-container/50 px-2 py-0.5 text-[9px] font-black uppercase text-on-success-container">Confirmed</span>
                              </div>
                            </div>
                          ))}
                          {confirmedTickets.length === 0 && (
                            <div className="py-12 text-center">
                              <span className="material-symbols-outlined text-4xl text-outline-variant">explore_off</span>
                              <p className="mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">No upcoming trips</p>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Recent Notifications */}
                      <section className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-headline text-lg font-black text-on-surface">
                            <span className="material-symbols-outlined text-primary">notifications_active</span>
                            Alerts
                          </h3>
                          <button onClick={() => setActiveTab("notifications")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                            View All
                          </button>
                        </div>
                        <div className="space-y-3">
                          {groupedNotifications.slice(0, 4).map((notification) => (
                            <div key={notification._id} className="flex items-start gap-3 rounded-2xl bg-surface-container-low/50 p-4 border border-outline-variant/5">
                              <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${notification.isRead ? "bg-outline-variant" : "bg-secondary"}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs leading-relaxed ${notification.isRead ? "text-on-surface-variant" : "font-bold text-on-surface"}`}>
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-[9px] font-bold text-outline-variant uppercase">{formatDateTimeLabel(notification.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {/* ── My Bookings Tab ── */}
                {activeTab === "bookings" && (
                  <section className="space-y-6">
                    <div className="grid gap-4">
                      {bookings.map((booking) => (
                        <article key={booking._id} className="rounded-3xl border border-outline-variant/20 bg-surface p-5 sm:p-8 shadow-sm transition hover:shadow-md">
                          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="truncate font-headline text-lg sm:text-xl font-black text-on-surface">{booking.tripId?.title}</h4>
                                <span className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                                  booking.status === "confirmed"
                                    ? new Date(booking.tripId?.endDate) < new Date() ? "bg-primary/10 text-primary" : "bg-success-container text-on-success-container"
                                    : "bg-warning-container text-on-warning-container"
                                }`}>
                                  {booking.status === "confirmed" && new Date(booking.tripId?.endDate) < new Date() ? "Completed" : booking.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm font-bold text-on-surface-variant">
                                <span className="truncate">{booking.tripId?.source}</span>
                                <span className="material-symbols-outlined text-sm shrink-0">arrow_forward</span>
                                <span className="truncate">{booking.tripId?.destination}</span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-black uppercase tracking-widest text-outline">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">calendar_today</span>{formatDateLabel(booking.tripId?.startDate)}</span>
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">group</span>{booking.seatsBooked} Seats</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 md:border-none md:pt-0 md:text-right">
                              {booking.status === "confirmed" && new Date(booking.tripId?.endDate) < new Date() ? (
                                <button
                                  onClick={() => setSelectedBookingForReview(booking)}
                                  className="w-full md:w-auto rounded-2xl bg-secondary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-secondary shadow-lg transition hover:scale-[1.02]"
                                >
                                  Leave Review
                                </button>
                              ) : (
                                <div className="w-full md:w-auto flex items-center justify-between md:block">
                                  <div className="md:hidden">
                                    <p className="text-[8px] font-bold text-outline-variant uppercase">Amount</p>
                                    <p className="font-headline text-lg font-black text-primary">{formatINR(booking.totalAmount)}</p>
                                  </div>
                                  <div className="hidden md:block">
                                    <p className="font-headline text-2xl font-black text-primary">{formatINR(booking.totalAmount)}</p>
                                    <p className="text-[10px] font-bold text-outline-variant uppercase mt-1">Transaction Total</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── E-Tickets Tab ── */}
                {activeTab === "tickets" && (
                  <section className="grid gap-8 lg:grid-cols-2">
                    {confirmedTickets.map((booking) => {
                      const ticketCode = getTicketCode(booking);
                      return (
                        <article key={booking._id} className="relative overflow-hidden rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <h4 className="truncate font-headline text-lg font-black text-on-surface">{booking.tripId?.title}</h4>
                              <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{booking.tripId?.source} → {booking.tripId?.destination}</p>
                            </div>
                            <div className="rounded-full bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-on-secondary">Ticket Active</div>
                          </div>

                          <div className="mt-8 grid grid-cols-2 gap-6 border-y border-outline-variant/10 py-6">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Traveler</p>
                              <p className="text-sm font-bold text-on-surface mt-1">{profile?.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Ticket ID</p>
                              <p className="font-mono text-xs font-black text-on-surface mt-1">{ticketCode}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Departure</p>
                              <p className="text-sm font-bold text-on-surface mt-1">{formatDateLabel(booking.tripId?.startDate)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant">Pickup</p>
                              <p className="text-sm font-bold text-on-surface mt-1 truncate">{booking.pickupPointId?.location || "Main Terminal"}</p>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-secondary">verified</span>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Digital Boarding Pass</p>
                            </div>
                            <button className="rounded-xl bg-primary/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition">Download PDF</button>
                          </div>
                        </article>
                      );
                    })}
                  </section>
                )}

                {/* ── Notifications Tab ── */}
                {activeTab === "notifications" && (
                  <section className="rounded-3xl border border-outline-variant/20 bg-surface shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4 bg-surface-container-low/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Notification Inbox</p>
                      <button onClick={markAllNotificationsRead} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Mark all read</button>
                    </div>
                    <div className="divide-y divide-outline-variant/5">
                      {notifications.map((notification) => (
                        <article key={notification._id} className="group flex items-start gap-5 px-6 py-6 transition hover:bg-surface-container-lowest">
                          <div className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-outline-variant/40" : "bg-secondary shadow-[0_0_8px_rgba(79,111,22,0.4)]"}`} />
                          <div className="flex-1">
                            <p className={`text-sm leading-relaxed ${notification.isRead ? "text-on-surface-variant" : "font-bold text-on-surface"}`}>
                              {notification.message}
                            </p>
                            <p className="mt-2 text-[10px] font-bold text-outline-variant uppercase">{formatDateTimeLabel(notification.createdAt)}</p>
                          </div>
                          {!notification.isRead && (
                            <button onClick={() => markNotificationRead(notification._id)} className="rounded-lg bg-surface-container px-3 py-1.5 text-[9px] font-black uppercase text-on-surface-variant opacity-0 group-hover:opacity-100 transition">Mark read</button>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Recommendations Tab ── */}
                {activeTab === "recommendations" && (
                  <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {recommendedTrips.map((trip) => (
                      <article key={trip._id} className="group overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface transition hover:shadow-xl">
                        <div className="aspect-[4/3] bg-surface-container-high overflow-hidden">
                          {trip.media?.length > 0 ? (
                            <img src={trip.media[0]} alt={trip.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-outline-variant">
                              <span className="material-symbols-outlined text-5xl">image</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h4 className="truncate font-headline text-lg font-black text-on-surface">{trip.title}</h4>
                          <p className="mt-1 text-xs font-bold text-on-surface-variant uppercase tracking-widest">{trip.destination}</p>
                          <div className="mt-6 flex items-center justify-between">
                            <p className="font-headline text-xl font-black text-primary">{formatINR(trip.pricePerPerson)}</p>
                            <Link to={`/trips/${trip._id}`} className="rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary">Details</Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Review Modal */}
      {selectedBookingForReview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-surface p-8 shadow-2xl border border-outline-variant/20">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-6">
              <h2 className="font-headline text-xl font-black text-on-surface">
                Post <span className="text-secondary">Review</span>
              </h2>
              <button onClick={() => setSelectedBookingForReview(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-8 space-y-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-4">Organizer Experience</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm((p) => ({ ...p, rating: star }))}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                        star <= reviewForm.rating ? "bg-secondary text-on-secondary shadow-lg" : "bg-surface-container-low text-outline-variant hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[1.4rem]">{star <= reviewForm.rating ? "star" : "star_outline"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant mb-4">Share Your Thoughts</p>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                  rows={4}
                  placeholder="How was the coordination, safety, and overall vibe?"
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 text-sm text-on-surface outline-none focus:border-primary/40 transition"
                />
              </div>

              <button
                onClick={submitReview}
                disabled={isReviewSubmitting}
                className="w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary shadow-xl transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isReviewSubmitting ? "Submitting Audit..." : "Post Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
