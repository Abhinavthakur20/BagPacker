import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";
import { setSearchTripsCache } from "../store/cacheSlice";

const TRIPS_PER_PAGE = 5;

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
      ? trip.images
          .map((imagePath) =>
            optimizeCloudinaryImage(resolveMediaUrl(imagePath), "f_auto,q_auto,w_900,dpr_auto"),
          )
          .filter(Boolean)
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
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(visibleTrips.length / TRIPS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageStartIndex = (page - 1) * TRIPS_PER_PAGE;
  const cards = visibleTrips.slice(pageStartIndex, pageStartIndex + TRIPS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedDate, submittedDestination, submittedSource, maxBudget, seatsNeeded, sortBy]);

  const applySearch = () => {
    setSubmittedSource(fromCity);
    setSubmittedDestination(toCity);
    setSubmittedDate(travelDate);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const clearFilters = () => {
    setFromCity("");
    setToCity("");
    setTravelDate("");
    setMaxBudget(30000);
    setSeatsNeeded(1);
    setSortBy("recommended");
    setSubmittedSource("");
    setSubmittedDestination("");
    setSubmittedDate("");
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-xl font-extrabold tracking-tight text-primary sm:text-2xl md:text-3xl">
              Expeditions Found
            </h1>
            <p className="mt-1 text-on-surface-variant">
              {visibleTrips.length} adventurous trips waiting for you
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

        {/* ── Horizontal Filter Bar (Desktop) ── */}
        <div className="mb-8 hidden items-end gap-4 rounded-2xl bg-surface-container-low p-5 md:flex flex-wrap lg:flex-nowrap">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              From
            </label>
            <input
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder="Source city"
              className="w-full rounded-xl bg-surface-container-highest px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              To
            </label>
            <input
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              placeholder="Destination city"
              className="w-full rounded-xl bg-surface-container-highest px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full rounded-xl bg-surface-container-highest px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex-[1.5] min-w-[160px]">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Max Budget
              </label>
              <span className="text-xs font-bold text-primary">
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

          <div className="w-[80px]">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Seats
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={seatsNeeded}
              onChange={(e) =>
                setSeatsNeeded(Number(e.target.value || 1))
              }
              className="w-full rounded-xl bg-surface-container-highest px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-bold text-primary hover:bg-surface-container-highest"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applySearch}
              className="rounded-xl bg-primary-container px-6 py-2.5 text-sm font-bold text-white hover:bg-primary"
            >
              Search
            </button>
          </div>
        </div>

        <section className="space-y-6">
          {error ? (
            <div className="rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">
              {error}
            </div>
          ) : null}

          {isLoading ? <LoadingPanel label="Loading trips..." className="rounded-2xl !p-8" /> : null}

          {!isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cards.map((trip, index) => {
                const imageCount = trip.images?.length || 1;
                const activeImageIndex =
                  imageCount > 1 ? (carouselTick + index) % imageCount : 0;

                return (
                  <article
                    key={trip.id}
                    className="group overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_10px_24px_rgba(28,28,24,0.08)] transition hover:-translate-y-1"
                  >
                    <div className="relative h-56 w-full overflow-hidden">
                      <img
                        src={trip.images[activeImageIndex] || campfireImage}
                        alt={trip.title}
                        className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                      />
                      {pageStartIndex + index === 0 ? (
                        <span className="absolute left-3 top-3 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                          Trending
                        </span>
                      ) : null}
                      {imageCount > 1 ? (
                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/35 px-2 py-1">
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
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 break-words font-headline text-lg font-bold leading-tight text-primary">
                          {trip.title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-1 text-[11px] font-bold text-primary">
                          {trip.duration}
                        </span>
                      </div>

                      <p className="text-sm text-on-surface-variant">{trip.route}</p>

                      <div className="flex items-center justify-between text-sm">
                        <p className="font-headline text-xl font-black text-primary">
                          {formatINR(trip.price)}
                        </p>
                        <p className="text-on-surface-variant">{trip.seatsLeft} seats left</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                        <p className="text-xs text-on-surface-variant">
                          by <span className="font-bold text-primary">{trip.organizer}</span>
                        </p>
                        <Link
                          to={`/trips/${trip.id}`}
                          className="inline-flex items-center gap-1 text-sm font-bold text-secondary"
                        >
                          View
                          <span className="material-symbols-outlined text-base">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!isLoading && visibleTrips.length === 0 ? (
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

          {!isLoading && visibleTrips.length > 0 && totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
              <p className="text-sm text-on-surface-variant">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className="rounded-lg bg-surface-container-highest px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      pageNumber === page
                        ? "bg-primary text-white"
                        : "bg-surface-container-highest text-primary"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg bg-surface-container-highest px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showMobileFilters ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4 md:hidden">
          <div className="mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-lg font-bold text-primary">
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
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-3 font-bold text-primary"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applySearch}
                  className="w-full rounded-xl bg-primary py-3 font-bold text-white"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}
