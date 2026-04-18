import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api, resolveMediaUrl } from "../lib/api";
import { setSearchTripsCache } from "../store/cacheSlice";

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
  images:
    Array.isArray(trip.images) && trip.images.length
      ? trip.images.map((imagePath) => resolveMediaUrl(imagePath)).filter(Boolean)
      : [campfireImage],
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
  joiningCount: 5 + index,
});

export default function SearchPage() {
  const dispatch = useDispatch();
  const searchTripsCache = useSelector((state) => state.cache.searchTrips);
  const [params] = useSearchParams();
  const sourceFromParams = params.get("from") || "";
  const destinationFromParams = params.get("to") || "";
  const dateFromParams = params.get("date") || "";
  const [maxBudget, setMaxBudget] = useState(30000);
  const [sortBy, setSortBy] = useState("recommended");
  const [fromCity, setFromCity] = useState(sourceFromParams);
  const [toCity, setToCity] = useState(destinationFromParams);
  const [travelDate, setTravelDate] = useState(dateFromParams);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [submittedSource, setSubmittedSource] = useState(sourceFromParams);
  const [submittedDestination, setSubmittedDestination] = useState(destinationFromParams);
  const [submittedDate, setSubmittedDate] = useState(dateFromParams);
  const [trips, setTrips] = useState([]);
  const [carouselTick, setCarouselTick] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchTrips = async (options = {}) => {
    const query = new URLSearchParams();
    if (submittedSource) query.set("source", submittedSource);
    if (submittedDestination) query.set("destination", submittedDestination);
    if (submittedDate) query.set("date", submittedDate);
    query.set("page", "1");
    query.set("limit", "60");
    const cacheKey = query.toString();
    const cached = searchTripsCache[cacheKey];
    const hasFreshCache =
      cached &&
      Date.now() - cached.cachedAt < 60000 &&
      !options.forceRefresh;

    if (hasFreshCache) {
      setTrips(Array.isArray(cached.items) ? cached.items : []);
      setError("");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await api.get(`/trips?${query.toString()}`, {
        cacheTtlMs: 45000,
        forceRefresh: Boolean(options.forceRefresh),
      });
      const list = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
          ? response
          : [];
      setTrips(list);
      dispatch(
        setSearchTripsCache({
          key: cacheKey,
          items: list,
        }),
      );
    } catch (fetchError) {
      setError(fetchError.message);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const sourceParam = params.get("from");
    const destinationParam = params.get("to");
    const dateParam = params.get("date");

    if (sourceParam !== null) {
      setFromCity(sourceParam);
      setSubmittedSource(sourceParam);
    }

    if (destinationParam !== null) {
      setToCity(destinationParam);
      setSubmittedDestination(destinationParam);
    }

    if (dateParam !== null) {
      setTravelDate(dateParam);
      setSubmittedDate(dateParam);
    }
  }, [params]);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedDate, submittedDestination, submittedSource, searchTripsCache]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCarouselTick((tick) => tick + 1);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  const visibleTrips = useMemo(() => {
    const normalizedTrips = trips.map(mapTrip);
    const filtered = normalizedTrips.filter(
      (trip) =>
        trip.price <= maxBudget &&
        trip.seatsLeft >= seatsNeeded,
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
  }, [maxBudget, seatsNeeded, sortBy, trips]);

  const cards = visibleTrips;

  const applySearch = () => {
    setSubmittedSource(fromCity);
    setSubmittedDestination(toCity);
    setSubmittedDate(travelDate);
    setShowMobileFilters(false);
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl md:text-5xl">
              Expeditions Found
            </h1>
            <p className="mt-1 text-on-surface-variant">
              {cards.length} adventurous trips waiting for you
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white md:hidden"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              Filters
            </button>
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
          <aside className="hidden md:col-span-3 md:block">
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
                  <input
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    placeholder="Source city"
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    To
                  </label>
                  <input
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    placeholder="Destination city"
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                    Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                  />
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
                  onClick={applySearch}
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

            {isLoading ? <LoadingPanel label="Loading trips..." className="rounded-2xl !p-8" /> : null}

            {!isLoading
              ? cards.map((trip, index) => (
                  (() => {
                    const imageCount = trip.images?.length || 1;
                    const activeImageIndex =
                      imageCount > 1 ? (carouselTick + index) % imageCount : 0;

                    return (
                  <article
                    key={trip.id}
                    className="group overflow-hidden rounded-2xl border border-transparent bg-surface-container-lowest shadow-[0_8px_22px_rgba(28,28,24,0.06)] transition hover:border-outline-variant/30 lg:h-[320px]"
                  >
                    <div className="grid h-full lg:grid-cols-[300px_1fr]">
                      <div className="relative h-52 w-full overflow-hidden md:h-56 lg:h-full">
                        <img
                          src={trip.images[activeImageIndex] || campfireImage}
                          alt={trip.title}
                          className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                        />
                        {imageCount > 1 ? (
                          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
                            {trip.images.map((_, dotIndex) => (
                              <span
                                key={`${trip.id}-dot-${dotIndex}`}
                                className={`h-1.5 w-1.5 rounded-full ${
                                  dotIndex === activeImageIndex ? "bg-white" : "bg-white/45"
                                }`}
                              />
                            ))}
                          </div>
                        ) : null}
                        {index === 0 ? (
                          <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                            Trending
                          </span>
                        ) : null}
                      </div>

                      <div className="p-5 lg:flex lg:h-full lg:flex-col">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <h2 className="break-words font-headline text-xl font-bold leading-tight text-primary sm:text-2xl">
                              {trip.title}
                            </h2>
                            <div className="text-left sm:text-right">
                              <p className="font-headline text-xl font-black text-primary sm:text-2xl">
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

                          <div className="grid gap-y-2 text-sm text-on-surface-variant md:grid-cols-2">
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
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-4 lg:mt-auto">
                          <div className="space-y-1">
                            <div className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-primary">
                              +{trip.joiningCount} Joining
                            </div>
                          </div>
                          <Link
                            to={`/trips/${trip.id}`}
                            className="flex items-center gap-2 rounded-xl bg-secondary-container px-5 py-2.5 font-bold text-on-secondary-container transition hover:bg-secondary hover:text-white"
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
                    );
                  })()
                ))
              : null}

            {!isLoading && cards.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                No trips match the current filters.
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => fetchTrips({ forceRefresh: true })}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    Refresh results
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {showMobileFilters ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4 md:hidden">
          <div className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold text-primary">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  From
                </label>
                <input
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  placeholder="Source city"
                  className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  To
                </label>
                <input
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  placeholder="Destination city"
                  className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                  Date
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                />
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
                  onChange={(e) => setSeatsNeeded(Number(e.target.value || 1))}
                  className="w-full rounded-xl bg-surface-container-highest px-3 py-3 text-sm"
                />
              </div>
              <button
                onClick={applySearch}
                className="w-full rounded-xl bg-primary py-3 font-bold text-white"
              >
                Apply Search
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}
