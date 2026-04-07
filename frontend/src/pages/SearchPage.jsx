import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import { formatINR } from "../data/mockData";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api } from "../lib/api";

const getTripDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Scheduled Trip";
  }

  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const totalNights = Math.max(0, totalDays - 1);
  return `${totalDays} Days, ${totalNights} Nights`;
};

const mapTrip = (trip, index) => ({
  id: trip._id,
  title: trip.title,
  route: `${trip.source} -> ${trip.destination}`,
  location: trip.destination,
  date: trip.startDate,
  duration: getTripDuration(trip.startDate, trip.endDate),
  seatsLeft: trip.availableSeats,
  price: trip.pricePerPerson,
  trustScore: trip.organizerId?.trustScore || 0,
  organizer:
    trip.organizerId?.businessName ||
    trip.organizerId?.businessType ||
    "Organizer",
  departureType: "Scheduled Departure",
  inclusions: ["Transport", "Stay", "Trip Support"],
  image: campfireImage,
  joiningCount: 5 + index,
});

export default function SearchPage() {
  const [params] = useSearchParams();
  const [maxBudget, setMaxBudget] = useState(30000);
  const [sortBy, setSortBy] = useState("recommended");
  const [fromCity, setFromCity] = useState("New Delhi");
  const [toCity, setToCity] = useState("Spiti Valley");
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [submittedSource, setSubmittedSource] = useState("New Delhi");
  const [submittedDestination, setSubmittedDestination] =
    useState("Spiti Valley");
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const routeFilter = (params.get("to") || "").toLowerCase();

  useEffect(() => {
    const destinationFromParams = params.get("to");
    if (!destinationFromParams) {
      return;
    }

    setToCity(destinationFromParams);
    setSubmittedDestination(destinationFromParams);
  }, [params]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (submittedSource) query.set("source", submittedSource);
    if (submittedDestination) query.set("destination", submittedDestination);

    const fetchTrips = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get(`/trips?${query.toString()}`);
        setTrips(Array.isArray(response) ? response : []);
      } catch (fetchError) {
        setError(fetchError.message);
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, [submittedDestination, submittedSource]);

  const visibleTrips = useMemo(() => {
    const normalizedTrips = trips.map(mapTrip);
    const filtered = normalizedTrips.filter(
      (trip) =>
        trip.price <= maxBudget &&
        trip.seatsLeft >= seatsNeeded &&
        (routeFilter.length === 0 ||
          trip.title.toLowerCase().includes(routeFilter) ||
          trip.route.toLowerCase().includes(routeFilter)),
    );

    if (sortBy === "price_low") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price_high") {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (sortBy === "upcoming") {
      return [...filtered].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }
    return filtered;
  }, [maxBudget, routeFilter, seatsNeeded, sortBy, trips]);

  const cards = visibleTrips;

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary">
              Expeditions Found
            </h1>
            <p className="mt-1 text-on-surface-variant">
              {cards.length} adventurous trips waiting for you
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-on-surface-variant">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg bg-surface-container-highest px-3 py-2 text-sm font-medium"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="upcoming">Upcoming Soon</option>
            </select>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-12">
          <aside className="md:col-span-3">
            <div className="sticky top-28 rounded-2xl bg-surface-container-low p-6">
              <h2 className="mb-6 flex items-center gap-2 font-headline text-xl font-bold text-primary">
                <span className="material-symbols-outlined">tune</span>
                Filters
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    From
                  </label>
                  <select
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  >
                    <option>New Delhi</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    To
                  </label>
                  <select
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  >
                    <option>Spiti Valley</option>
                    <option>Leh</option>
                    <option>Rishikesh</option>
                    <option>Munnar</option>
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                      Budget
                    </label>
                    <span className="text-sm font-bold text-primary">
                      {formatINR(maxBudget)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="50000"
                    step="500"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    Min. Seats Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={seatsNeeded}
                    onChange={(e) =>
                      setSeatsNeeded(Number(e.target.value || 1))
                    }
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  />
                </div>

                <button
                  onClick={() => {
                    setSubmittedSource(fromCity);
                    setSubmittedDestination(toCity);
                  }}
                  className="w-full rounded-xl bg-primary-container py-3 font-bold text-white hover:bg-primary"
                >
                  Apply Search
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-6 md:col-span-9">
            {error ? (
              <div className="rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-2xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                Loading trips...
              </div>
            ) : null}

            {!isLoading
              ? cards.map((trip, index) => (
                  <article
                    key={trip.id}
                    className="group overflow-hidden rounded-3xl border border-transparent bg-surface-container-lowest shadow-[0_12px_32px_rgba(28,28,24,0.06)] transition hover:border-outline-variant/30"
                  >
                    <div className="grid lg:grid-cols-3">
                      <div className="relative h-72 overflow-hidden lg:h-full">
                        <img
                          src={trip.image}
                          alt={trip.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        {index === 0 ? (
                          <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                            Trending
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-5 p-7 lg:col-span-2">
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="font-headline text-3xl font-bold leading-tight text-primary">
                            {trip.title}
                          </h2>
                          <div className="text-right">
                            <p className="font-headline text-3xl font-black text-primary">
                              {formatINR(trip.price)}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                              per person
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-primary-fixed px-2 py-1 text-xs font-bold text-primary">
                            {trip.trustScore} Trust Score
                          </span>
                          <p className="text-sm text-on-surface-variant">
                            by{" "}
                            <span className="font-bold text-primary">
                              {trip.organizer}
                            </span>
                          </p>
                        </div>

                        <div className="grid gap-y-3 text-sm text-on-surface-variant md:grid-cols-2">
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-secondary">
                              route
                            </span>
                            {trip.route}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-secondary">
                              calendar_month
                            </span>
                            {new Date(trip.date).toLocaleDateString("en-IN")}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-secondary">
                              event_seat
                            </span>
                            {trip.seatsLeft} Seats Available
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-secondary">
                              schedule
                            </span>
                            {trip.duration}
                          </p>
                          <p className="flex items-center gap-2 md:col-span-2">
                            <span className="material-symbols-outlined text-base text-secondary">
                              event_repeat
                            </span>
                            {trip.departureType}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(trip.inclusions || []).slice(0, 4).map((item) => (
                            <span
                              key={item}
                              className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-primary"
                            >
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-5">
                          <div className="space-y-1">
                            <div className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-primary">
                              +{trip.joiningCount} Joining
                            </div>
                          </div>
                          <Link
                            to={`/trips/${trip.id}`}
                            className="flex items-center gap-2 rounded-xl bg-secondary-container px-6 py-3 font-bold text-on-secondary-container transition hover:bg-secondary hover:text-white"
                          >
                            View Details
                            <span className="material-symbols-outlined text-sm">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              : null}

            {!isLoading && cards.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                No trips match the current filters.
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
