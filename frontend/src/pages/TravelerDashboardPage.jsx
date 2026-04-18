import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";
import { setUser } from "../store/authSlice";

export default function TravelerDashboardPage() {
  const dispatch = useDispatch();
  const storedUser = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const isLoggedIn = Boolean(token);
  const [profile, setProfile] = useState(storedUser);
  const [bookings, setBookings] = useState([]);
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
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-8">
        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
              {profile?.name ? `Namaste, ${profile.name.split(" ")[0]}!` : "Traveler Dashboard"}
            </h1>
            <p className="text-on-surface-variant">
              Track bookings, trust score, and your next expedition.
            </p>
          </div>
          <Link
            to="/trips/search"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg"
          >
            Explore Trips
          </Link>
        </header>

        {isLoading ? (
          <LoadingPanel label="Loading dashboard..." />
        ) : null}

        {!isLoading ? (
          <>
            <section className="overflow-hidden rounded-3xl bg-linear-to-r from-primary to-primary-container px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-9">
              <div className="flex items-stretch justify-between gap-2 text-center sm:gap-4 md:grid md:gap-8 md:grid-cols-3">
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-4xl font-extrabold tracking-tight text-secondary-container sm:text-5xl md:text-6xl">
                    {bookings.length}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-on-primary-container sm:text-[10px] md:text-[11px] md:tracking-[0.2em]">
                    Total Bookings
                  </p>
                </div>
                <div className="min-w-0 flex-1 border-x border-white/15 px-2 md:border-x md:border-y-0 md:px-0">
                  <p className="font-headline text-4xl font-extrabold tracking-tight text-secondary-container sm:text-5xl md:text-6xl">
                    {profile?.trustScore ?? 0}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-on-primary-container sm:text-[10px] md:text-[11px] md:tracking-[0.2em]">
                    Trust Score
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-4xl font-extrabold tracking-tight text-secondary-container sm:text-5xl md:text-6xl">
                    {recommendedTrips.length}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-on-primary-container sm:text-[10px] md:text-[11px] md:tracking-[0.2em]">
                    Fresh Recommendations
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2 md:gap-6">
              {stats.map(([label, value, icon]) => (
                <article
                  key={label}
                  className="rounded-2xl bg-surface-container-lowest p-3 shadow-[0_12px_32px_rgba(28,28,24,0.06)] sm:p-4 md:p-7"
                >
                  <div className="mb-2 flex items-center justify-between md:mb-4">
                    <span className="material-symbols-outlined rounded-lg bg-primary-fixed p-1.5 text-base text-primary md:rounded-xl md:p-2 md:text-xl">
                      {icon}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-outline md:text-xs md:tracking-[0.14em]">
                      Live
                    </span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-outline md:text-xs md:tracking-[0.14em]">
                    {label}
                  </p>
                  <p className="mt-1 font-headline text-4xl font-extrabold text-primary md:mt-2 md:text-5xl">
                    {value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-headline text-3xl font-extrabold text-primary">
                    Recent Bookings
                  </h2>
                  <Link to="/payment" className="text-sm font-bold text-secondary">
                    Open Booking Center
                  </Link>
                </div>

                <div className="space-y-4">
                  {bookings.length ? (
                    bookings.slice(0, 4).map((booking) => (
                      <div
                        key={booking._id}
                        className="rounded-2xl bg-surface-container-low p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-bold text-primary">
                              {booking.tripId?.title || "Trip"}
                            </p>
                            <p className="text-sm text-on-surface-variant">
                              {booking.tripId?.source} to {booking.tripId?.destination}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatINR(booking.totalAmount)}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                              {booking.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
                      No bookings yet.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-headline text-3xl font-extrabold text-primary">
                    Recommended for You
                  </h2>
                  <Link to="/trips/search" className="text-sm font-bold text-secondary">
                    View all trips
                  </Link>
                </div>

                <div className="space-y-4">
                  {recommendedTrips.map((trip) => (
                    <article
                      key={trip._id}
                      className="rounded-2xl bg-surface-container-low p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-headline text-2xl font-bold text-primary">
                            {trip.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant">
                            {trip.source} to {trip.destination}
                          </p>
                          <p className="mt-2 text-sm text-on-surface-variant">
                            {trip.availableSeats} seats left
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-headline text-2xl font-black text-primary">
                            {formatINR(trip.pricePerPerson)}
                          </p>
                          <Link
                            to={`/trips/${trip._id}`}
                            className="mt-2 inline-block rounded-xl bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </section>

            <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Notifications
                </h2>
                <p className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {notifications.filter((item) => !item.isRead).length} unread
                </p>
              </div>

              {notifications.length ? (
                <div className="space-y-3">
                  {notifications.slice(0, 6).map((notification) => (
                    <article
                      key={notification._id}
                      className={`rounded-2xl p-4 ${
                        notification.isRead
                          ? "bg-surface-container-low"
                          : "bg-primary-fixed/35"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-primary">{notification.message}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {new Date(notification.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <button
                            onClick={() => markNotificationRead(notification._id)}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
                          >
                            Mark Read
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
                  No notifications yet.
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
