import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import CityAutocompleteInput from "../components/ui/CityAutocompleteInput";
import { formatINR } from "../data/mockData";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";
import { setSearchTripsCache } from "../store/cacheSlice";

const TRIPS_PER_PAGE = 6;

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

const mapTrip = (trip) => ({
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
  joiningCount: Math.max(0, Number(trip.totalSeats || 0) - Number(trip.availableSeats || 0)),
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
    query.set("priceMax", String(maxBudget));
    query.set("seatsMin", String(seatsNeeded));
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
  }, [submittedDate, submittedDestination, submittedSource, maxBudget, seatsNeeded]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCarouselTick((tick) => tick + 1);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  const visibleTrips = useMemo(() => {
    const normalizedTrips = trips.map(mapTrip);
    const filtered = normalizedTrips;

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
  }, [sortBy, trips]);

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
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* ── Hero banner ── */}
        <div className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d3a28] via-[#14503a] to-[#1a6e50] p-8 md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Discover</p>
              <h1 className="mt-2 font-headline text-3xl font-black tracking-tight text-white md:text-4xl">
                Explore Trips
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                {visibleTrips.length} curated adventures handpicked by verified organizers across India.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm md:hidden"
              >
                <span className="material-symbols-outlined text-base">tune</span>
                Filters
              </button>
              <label className="hidden text-xs font-bold uppercase tracking-widest text-white/50 md:block">
                Sort
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm outline-none [&>option]:text-black"
              >
                <option value="recommended">Recommended</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="upcoming">Upcoming Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Floating Filter Bar (Desktop) ── */}
        <div className="mb-8 hidden items-end gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[0_8px_30px_rgba(28,28,24,0.06)] md:flex flex-wrap lg:flex-nowrap">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
              From
            </label>
            <CityAutocompleteInput
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder="Source city"
              className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm transition focus:border-primary/40"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
              To
            </label>
            <CityAutocompleteInput
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              placeholder="Destination city"
              className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm transition focus:border-primary/40"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
              Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm transition focus:border-primary/40"
            />
          </div>

          <div className="flex-[1.5] min-w-[160px]">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
                Max Budget
              </label>
              <span className="text-xs font-black text-primary">
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
            <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
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
              className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm transition focus:border-primary/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-surface-variant transition hover:bg-surface-container-highest"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applySearch}
              className="rounded-xl bg-primary px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
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

          {isLoading ? (
            <LoadingPanel
              label="Loading trips..."
              variant="grid"
              className="rounded-2xl !p-4 md:!p-8"
            />
          ) : null}

          {!isLoading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-3">
              {cards.map((trip, index) => {
                const imageCount = trip.images?.length || 1;
                const activeImageIndex =
                  imageCount > 1 ? (carouselTick + index) % imageCount : 0;
                const seatsFilled = trip.joiningCount || 0;
                const totalSeats = seatsFilled + (trip.seatsLeft || 0);
                const fillPercent = totalSeats > 0 ? Math.round((seatsFilled / totalSeats) * 100) : 0;
                const trustScore = trip.trustScore || 0;

                return (
                  <Link
                    key={trip.id}
                    to={`/trips/${trip.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-[1.6rem] bg-surface-container-lowest shadow-[0_4px_20px_rgba(28,28,24,0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(1,45,29,0.18)]"
                  >
                    {/* ── Image with gradient overlay ── */}
                    <div className="relative h-32 sm:h-60 w-full overflow-hidden">
                      <img
                        src={trip.images[activeImageIndex] || campfireImage}
                        alt={trip.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      {/* Top badges row */}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2 sm:p-4">
                        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[7px] sm:px-3 sm:py-1 sm:text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                          {trip.duration}
                        </span>
                        {pageStartIndex + index === 0 ? (
                          <span className="flex items-center gap-0.5 sm:gap-1 rounded-full bg-secondary px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                            <span className="material-symbols-outlined text-[10px] sm:text-xs">local_fire_department</span>
                            <span className="hidden sm:inline">Trending</span><span className="sm:hidden">Hot</span>
                          </span>
                        ) : trustScore >= 75 ? (
                          <span className="hidden sm:flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            {trustScore}% Trust
                          </span>
                        ) : null}
                      </div>

                      {/* Bottom overlay: price + location */}
                      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4">
                        <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-widest text-white/60">From</p>
                        <p className="font-headline text-base sm:text-2xl font-black text-white drop-shadow-lg">
                          {formatINR(trip.price)}
                        </p>
                      </div>

                      {/* Carousel dots */}
                      {imageCount > 1 ? (
                        <div className="absolute bottom-4 right-4 flex items-center gap-1">
                          {trip.images.map((_, dotIndex) => (
                            <span
                              key={`${trip.id}-dot-${dotIndex}`}
                              className={`h-1.5 rounded-full transition-all ${
                                dotIndex === activeImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* ── Card body ── */}
                    <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-3 sm:p-5">
                      <h2 className="line-clamp-2 font-headline text-xs sm:text-[1.05rem] font-black leading-snug text-on-surface">
                        {trip.title}
                      </h2>

                      <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary">route</span>
                        {trip.route}
                      </div>

                      {/* Seat fill bar */}
                      <div className="mt-auto space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-on-surface-variant">{seatsFilled} joined</span>
                          <span className={trip.seatsLeft <= 3 ? "text-error" : "text-on-surface-variant"}>
                            {trip.seatsLeft} left
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/15">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Organizer row */}
                      <div className="flex items-center justify-between border-t border-outline-variant/10 pt-2 sm:pt-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary/10 text-[8px] sm:text-[10px] font-black text-primary">
                            {trip.organizer?.charAt(0) || "O"}
                          </div>
                          <span className="text-[9px] sm:text-xs font-bold text-on-surface-variant truncate max-w-[60px] sm:max-w-none">{trip.organizer}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-secondary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          Explore
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

          {!isLoading && visibleTrips.length === 0 ? (
            <div className="flex flex-col items-center rounded-[2rem] border border-dashed border-outline-variant/40 bg-surface-container-lowest py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-outline-variant">explore_off</span>
              <p className="mt-4 font-headline text-lg font-black text-on-surface">No trips found</p>
              <p className="mt-1 text-sm text-on-surface-variant">Try adjusting your filters or search a different route.</p>
              <button
                type="button"
                onClick={() => fetchTrips({ forceRefresh: true })}
                className="mt-6 rounded-xl bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
              >
                Refresh results
              </button>
            </div>
          ) : null}

          {!isLoading && visibleTrips.length > 0 && totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container-highest disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition ${
                    pageNumber === page
                      ? "bg-primary text-on-primary shadow-lg"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container-highest disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
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
                <CityAutocompleteInput
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
                <CityAutocompleteInput
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
