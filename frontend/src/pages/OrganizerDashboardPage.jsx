import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const badgeStylesByStatus = {
  active: "bg-[#d8f5e5] text-[#0f5132]",
  draft: "bg-[#e8e4db] text-[#415049]",
  completed: "bg-[#d6e7ff] text-[#123a6b]",
  cancelled: "bg-[#ffd7d7] text-[#8a1f1f]",
};

export default function OrganizerDashboardPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const [organizer, setOrganizer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview"); // "overview" | "trips"

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const organizerProfile = await api.get("/organizers/me");
        setOrganizer(organizerProfile);

        const organizerTrips = await api.get("/organizers/me/trips");
        setTrips(Array.isArray(organizerTrips) ? organizerTrips : []);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [isLoggedIn]);

  const dashboard = useMemo(() => {
    const totalTrips = trips.length;
    const activeTrips = trips.filter((trip) => trip.status === "active").length;
    const seatsFilled = trips.reduce(
      (sum, trip) => sum + Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats)),
      0,
    );
    const totalSeats = trips.reduce((sum, trip) => sum + safeNumber(trip.totalSeats), 0);
    const fillPercent = totalSeats ? Math.min(100, Math.round((seatsFilled / totalSeats) * 100)) : 0;
    const revenueEstimate = trips.reduce(
      (sum, trip) =>
        sum +
        Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats)) *
          safeNumber(trip.pricePerPerson),
      0,
    );
    const nextTrips = [...trips]
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())
      .slice(0, 6);

    const cards = [
      {
        label: "Total Trips",
        value: totalTrips,
        icon: "map",
        tone: "neutral",
      },
      {
        label: "Active Trips",
        value: activeTrips,
        icon: "pace",
        tone: "neutral",
      },
      {
        label: "Seats Filled",
        value: `${seatsFilled}/${totalSeats || 0}`,
        helper: `${fillPercent}% occupancy`,
        icon: "group",
        tone: "neutral",
      },
      {
        label: "Revenue (est.)",
        value: formatINR(revenueEstimate),
        helper: "Based on seats filled",
        icon: "payments",
        tone: "primary",
      },
    ];

    return {
      cards,
      nextTrips,
      fillPercent,
      revenueEstimate,
      seatsFilled,
      totalSeats,
    };
  }, [trips]);

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access your organizer dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  const approvalTone =
    organizer?.approvalStatus === "approved"
      ? "bg-[#d8f5e5] text-[#0f5132]"
      : organizer?.approvalStatus === "rejected"
        ? "bg-[#ffd7d7] text-[#8a1f1f]"
        : "bg-[#ffe9cd] text-[#9b5600]";
  const canCreateTrips = organizer?.approvalStatus === "approved";

  const sortedTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [trips],
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:px-8">
        {error ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-outline-variant/25 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                  <span className="material-symbols-outlined">dashboard</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                    Organizer
                  </p>
                  <p className="truncate font-headline text-lg font-extrabold text-primary">
                    {organizer?.businessName || user?.name || "Dashboard"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                  Approval
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ${approvalTone}`}>
                    {organizer?.approvalStatus || "pending"}
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    {canCreateTrips ? "You can publish trips." : "Create trips after approval."}
                  </span>
                </div>
              </div>

              <nav className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveView("overview")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                    activeView === "overview"
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-primary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">space_dashboard</span>
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("trips")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                    activeView === "trips"
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-primary hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">inventory_2</span>
                  My Posted Trips
                </button>
                <Link
                  to="/trips/search"
                  className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-base">travel_explore</span>
                  Browse Trips
                </Link>
              </nav>

              <div className="mt-5 border-t border-outline-variant/25 pt-5 text-sm text-on-surface-variant">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                  Account
                </p>
                <div className="mt-3 space-y-2">
                  <p className="truncate">
                    <span className="font-semibold text-primary">Owner:</span>{" "}
                    {organizer?.userId?.name || user?.name || "N/A"}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-primary">Email:</span>{" "}
                    {organizer?.userId?.email || user?.email || "N/A"}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-primary">GST:</span>{" "}
                    {organizer?.gstNumber || "Not added"}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-primary">License:</span>{" "}
                    {organizer?.licenseUrl ? "Uploaded" : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-6">
            <header className="rounded-3xl bg-linear-to-br from-primary to-primary-container p-6 text-white shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
                    Organizer Portal
                  </p>
                  <h1 className="mt-2 font-headline text-2xl font-extrabold leading-tight md:text-3xl">
                    Welcome {organizer?.businessName || user?.name || "Organizer"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/80">
                    Track inventory, monitor seat fills, and manage trips with a clean dashboard view.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-4 py-2 text-xs font-black uppercase ${approvalTone}`}>
                    {organizer?.approvalStatus || "pending"}
                  </span>
                </div>
              </div>
            </header>

            {isLoading ? <LoadingPanel label="Loading organizer dashboard..." /> : null}

            {!isLoading ? (
              activeView === "overview" ? (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {dashboard.cards.map((card) => (
                      <article
                        key={card.label}
                        className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                              {card.label}
                            </p>
                            <p className="mt-2 break-words font-headline text-2xl font-black text-primary">
                              {card.value}
                            </p>
                            {card.helper ? (
                              <p className="mt-2 text-sm font-semibold text-on-surface-variant">
                                {card.helper}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={`material-symbols-outlined rounded-2xl p-3 ${
                              card.tone === "primary"
                                ? "bg-secondary-container text-on-secondary-container"
                                : "bg-primary-fixed text-primary"
                            }`}
                          >
                            {card.icon}
                          </span>
                        </div>
                      </article>
                    ))}
                  </section>

                  <section className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
                    <article className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
                      <h2 className="font-headline text-xl font-extrabold text-primary">
                        Performance
                      </h2>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Snapshot based on your current trips.
                      </p>

                      <div className="mt-6 space-y-5">
                        <div className="rounded-2xl bg-surface-container-low p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-outline">
                              Occupancy
                            </p>
                            <p className="font-headline text-lg font-black text-primary">
                              {dashboard.fillPercent}%
                            </p>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-container-high">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-secondary to-secondary-container"
                              style={{ width: `${dashboard.fillPercent}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-on-surface-variant">
                            {dashboard.seatsFilled} seats filled across {dashboard.totalSeats || 0} total seats.
                          </p>
                        </div>

                        <div className="rounded-2xl bg-primary p-5 text-white">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">
                              Revenue (est.)
                            </p>
                            <span className="material-symbols-outlined rounded-2xl bg-white/10 p-2">
                              payments
                            </span>
                          </div>
                          <p className="mt-3 font-headline text-2xl font-black">
                            {formatINR(dashboard.revenueEstimate)}
                          </p>
                          <p className="mt-2 text-sm text-white/80">
                            This updates as more seats are filled.
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
                      <h2 className="font-headline text-xl font-extrabold text-primary">
                        Quick links
                      </h2>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Use the top navigation to create trips.
                      </p>
                      <div className="mt-5 space-y-3">
                        <Link
                          to="/trips/search"
                          className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary hover:bg-surface-container-high"
                        >
                          Browse trips
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setActiveView("trips")}
                          className="flex w-full items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-primary hover:bg-surface-container-high"
                        >
                          Open my posted trips
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                      </div>
                    </article>
                  </section>
                </>
              ) : (
                <section className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold text-primary">
                        My Posted Trips
                      </h2>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Select a trip to view seat fills and buyer details.
                      </p>
                    </div>
                    <span className={`rounded-full px-4 py-2 text-xs font-black uppercase ${approvalTone}`}>
                      {organizer?.approvalStatus || "pending"}
                    </span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-outline-variant/20">
                    <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr] gap-3 bg-surface-container-low px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-outline">
                      <span>Trip</span>
                      <span className="hidden md:block">Route</span>
                      <span>Seats</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {sortedTrips.length ? (
                      sortedTrips.map((trip) => {
                        const soldSeats = Math.max(
                          0,
                          safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats),
                        );
                        const totalSeats = safeNumber(trip.totalSeats) || 0;
                        const occupancy = totalSeats
                          ? Math.min(100, Math.round((soldSeats / totalSeats) * 100))
                          : 0;
                        const statusLabel = String(trip.status || "active").toLowerCase();
                        const statusTone =
                          badgeStylesByStatus[statusLabel] || "bg-[#e8e4db] text-[#415049]";

                        return (
                          <div
                            key={trip._id}
                            className="grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr] items-center gap-3 border-t border-outline-variant/20 bg-white px-4 py-4"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-headline text-base font-extrabold text-primary">
                                  {trip.title}
                                </p>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-on-surface-variant md:hidden">
                                {trip.source} → {trip.destination}
                              </p>
                              <p className="mt-1 text-xs text-outline">
                                {formatINR(safeNumber(trip.pricePerPerson))}/seat
                              </p>
                            </div>

                            <div className="hidden min-w-0 md:block">
                              <p className="truncate text-sm font-semibold text-on-surface-variant">
                                {trip.source} → {trip.destination}
                              </p>
                              <p className="mt-1 text-xs text-outline">
                                {new Date(trip.startDate || 0).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm font-bold text-primary">
                                {soldSeats}/{totalSeats}
                              </p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
                                <div
                                  className="h-full rounded-full bg-secondary-container"
                                  style={{ width: `${occupancy}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/dashboard/organizer/trips/${trip._id}`}
                                className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-white"
                              >
                                Buyers
                              </Link>
                              <Link
                                to={`/trips/${trip._id}/edit`}
                                className="rounded-xl border border-primary/15 px-3 py-2 text-xs font-black text-primary hover:bg-primary hover:text-white"
                              >
                                Edit
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white p-10 text-center text-on-surface-variant">
                        <p className="font-headline text-lg font-extrabold text-primary">
                          No trips yet
                        </p>
                        <p className="mt-2 text-sm">
                          Use the top navigation to create your first trip.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )
            ) : null}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
