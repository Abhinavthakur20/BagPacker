import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";
import { formatINR } from "../data/mockData";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function OrganizerTripsPage() {
  const token = useSelector((state) => state.auth.token);
  const isLoggedIn = Boolean(token);
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!isLoggedIn) return;
      try {
        setIsLoading(true);
        setError("");
        const organizerTrips = await api.get("/organizers/me/trips");
        setTrips(Array.isArray(organizerTrips?.items) ? organizerTrips.items : Array.isArray(organizerTrips) ? organizerTrips : []);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isLoggedIn]);

  const sortedTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [trips],
  );

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to view your posted trips.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout withFooter={false}>
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f94a4a]">
              Organizer
            </p>
            <h1 className="font-manrope text-2xl font-extrabold text-primary">
              My Posted Trips
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Open any trip to see seat fills and buyer details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/organizer"
              className="rounded-2xl bg-surface-container-low px-5 py-3 text-sm font-bold text-primary hover:bg-surface-container-high"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/trips/create"
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
            >
              Create Trip
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {isLoading ? <LoadingPanel label="Loading trips..." variant="list" /> : null}

        {!isLoading ? (
          <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
            <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr] gap-3 bg-surface-container-low px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-outline">
              <span>Trip</span>
              <span className="hidden md:block">Route</span>
              <span>Seats Filled</span>
              <span className="text-right">Actions</span>
            </div>

            {sortedTrips.length ? (
              sortedTrips.map((trip) => {
                const soldSeats = Math.max(
                  0,
                  safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats),
                );
                const totalSeats = safeNumber(trip.totalSeats);
                const occupancy = totalSeats ? Math.round((soldSeats / totalSeats) * 100) : 0;
                return (
                  <button
                    key={trip._id}
                    type="button"
                    onClick={() => navigate(`/dashboard/organizer/trips/${trip._id}`)}
                    className="grid w-full grid-cols-[1.6fr_1fr_0.9fr_0.9fr] items-center gap-3 border-t border-outline-variant/20 bg-surface-container px-5 py-5 text-left hover:bg-surface-container-lowest"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-manrope text-lg font-extrabold text-primary">
                        {trip.title}
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant md:hidden">
                        {trip.source} → {trip.destination}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f94a4a]">
                        {String(trip.status || "active")}
                      </p>
                    </div>

                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-sm font-semibold text-on-surface-variant">
                        {trip.source} → {trip.destination}
                      </p>
                      <p className="mt-1 text-xs text-outline">
                        {formatINR(safeNumber(trip.pricePerPerson))}/seat
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-primary">
                        {soldSeats}/{totalSeats}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-[#f94a4a]"
                          style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-outline">
                        {Math.min(100, Math.max(0, occupancy))}% filled
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white">
                        Buyers
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="bg-surface-container p-12 text-center text-on-surface-variant">
                <p className="font-manrope text-lg font-extrabold text-primary">
                  No trips posted yet
                </p>
                <p className="mt-2 text-sm">
                  Create a trip to start receiving bookings.
                </p>
                <div className="mt-5">
                  <Link
                    to="/trips/create"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#f94a4a] px-5 py-3 text-sm font-black text-white"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Create Trip
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}


