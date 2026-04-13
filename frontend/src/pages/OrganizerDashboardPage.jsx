import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api } from "../lib/api";
import { getStoredUser, isAuthenticated } from "../lib/auth";

export default function OrganizerDashboardPage() {
  const [organizer, setOrganizer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const user = getStoredUser();

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isAuthenticated()) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const organizerProfile = await api.get("/organizers/me");
        setOrganizer(organizerProfile);

        const organizerTrips = await api.get(
          `/trips?organizerId=${organizerProfile._id}&includeAllStatuses=true`,
        );
        setTrips(Array.isArray(organizerTrips) ? organizerTrips : []);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totalBookingsEstimate = trips.reduce(
      (sum, trip) => sum + Math.max(0, trip.totalSeats - trip.availableSeats),
      0,
    );
    const potentialRevenue = trips.reduce(
      (sum, trip) =>
        sum + Math.max(0, trip.totalSeats - trip.availableSeats) * trip.pricePerPerson,
      0,
    );
    const activeTrips = trips.filter((trip) => trip.status === "active").length;

    return [
      ["Total Trips", trips.length, "map"],
      ["Seats Filled", totalBookingsEstimate, "group"],
      ["Revenue", formatINR(potentialRevenue), "payments"],
      ["Active Trips", activeTrips, "pace"],
    ];
  }, [trips]);

  if (!isAuthenticated()) {
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

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              Organizer Portal
            </p>
            <h1 className="font-headline text-4xl font-extrabold text-primary">
              {organizer?.businessName || user?.name || "Organizer Dashboard"}
            </h1>
            <p className="mt-2 text-on-surface-variant">
              Track organizer status, live inventory, and trip performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold uppercase ${
                organizer?.approvalStatus === "approved"
                  ? "bg-[#d8f5e5] text-[#0f5132]"
                  : organizer?.approvalStatus === "rejected"
                    ? "bg-[#ffd7d7] text-[#8a1f1f]"
                    : "bg-[#ffe9cd] text-[#9b5600]"
              }`}
            >
              {organizer?.approvalStatus || "pending"}
            </span>
            <Link
              to="/trips/new"
              className={`rounded-xl px-5 py-3 text-sm font-bold ${
                organizer?.approvalStatus === "approved"
                  ? "bg-primary text-white"
                  : "pointer-events-none bg-surface-container-low text-outline"
              }`}
            >
              Create New Trip
            </Link>
          </div>
        </header>

        {isLoading ? (
          <LoadingPanel label="Loading organizer dashboard..." />
        ) : null}

        {!isLoading ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([label, value, icon], index) => (
                <article
                  key={label}
                  className={`rounded-2xl p-5 shadow-sm ${
                    index === 2 ? "bg-primary text-white" : "bg-surface-container-lowest"
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span
                      className={`material-symbols-outlined rounded-xl p-2 ${
                        index === 2
                          ? "bg-white/10 text-white"
                          : "bg-primary-fixed text-primary"
                      }`}
                    >
                      {icon}
                    </span>
                  </div>
                  <p className={`text-sm ${index === 2 ? "text-white/80" : "text-outline"}`}>
                    {label}
                  </p>
                  <p className="mt-2 font-headline text-4xl font-extrabold">
                    {value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Organizer Summary
                </h2>
                <div className="mt-5 space-y-4 rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
                  <p>
                    Owner: <span className="font-bold text-primary">{organizer?.userId?.name || user?.name || "N/A"}</span>
                  </p>
                  <p>
                    Email: <span className="font-bold text-primary">{organizer?.userId?.email || user?.email || "N/A"}</span>
                  </p>
                  <p>
                    GST: <span className="font-bold text-primary">{organizer?.gstNumber || "Not added yet"}</span>
                  </p>
                  <p>
                    License:{" "}
                    <span className="font-bold text-primary">
                      {organizer?.licenseUrl ? "Uploaded" : "Pending upload"}
                    </span>
                  </p>
                </div>
              </article>

              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-headline text-3xl font-extrabold text-primary">
                    My Trips
                  </h2>
                  <Link to="/trips/new" className="text-sm font-bold text-secondary">
                    Add Trip
                  </Link>
                </div>

                <div className="space-y-4">
                  {trips.length ? (
                    trips.map((trip) => {
                      const soldSeats = Math.max(0, trip.totalSeats - trip.availableSeats);
                      return (
                        <article
                          key={trip._id}
                          className="rounded-2xl bg-surface-container-low p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="font-headline text-2xl font-bold text-primary">
                                {trip.title}
                              </h3>
                              <p className="text-sm text-on-surface-variant">
                                {trip.source} to {trip.destination}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                {soldSeats}/{trip.totalSeats} seats filled
                              </p>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                                {trip.status}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
                      No trips created yet.
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
