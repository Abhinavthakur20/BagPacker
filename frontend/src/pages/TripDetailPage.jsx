import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";

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

export default function TripDetailPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const { id } = useParams();
  const [tripDetails, setTripDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [seats, setSeats] = useState(2);
  const [pickupPointId, setPickupPointId] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openDay, setOpenDay] = useState(1);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get(`/trips/${id}`);
        setTripDetails(response);

        if (response?.pickupPoints?.length) {
          setPickupPointId(response.pickupPoints[0]._id);
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  const trip = tripDetails;
  const tripImages = useMemo(() => {
    const images = Array.isArray(tripDetails?.images)
      ? tripDetails.images.map((path) => resolveMediaUrl(path)).filter(Boolean)
      : [];

    return images.length ? images : [campfireImage];
  }, [tripDetails]);

  const itinerary = useMemo(() => {
    if (tripDetails?.itinerary?.length) {
      return tripDetails.itinerary.map((item) => ({
        day: item.dayNumber,
        title: item.accommodation || "Planned Stay",
        note: item.activities,
      }));
    }

    return [
      {
        day: 1,
        title: "Arrival and Acclimatization",
        note: "Meet the group and settle in before the route briefing.",
      },
      {
        day: 2,
        title: "Mountain Transit Day",
        note: "Long scenic drive across high-altitude roads and pass crossings.",
      },
    ];
  }, [tripDetails]);

  const pickupOptions = useMemo(() => {
    if (tripDetails?.pickupPoints?.length) {
      return tripDetails.pickupPoints.map((point) => ({
        value: point._id,
        label: `${point.location} (${point.time})`,
      }));
    }

    return [];
  }, [tripDetails]);

  useEffect(() => {
    if (!pickupPointId && pickupOptions.length) {
      setPickupPointId(pickupOptions[0].value);
    }
  }, [pickupOptions, pickupPointId]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id, tripImages.length]);

  useEffect(() => {
    setOpenDay(itinerary[0]?.day || 1);
  }, [id, itinerary]);

  useEffect(() => {
    if (trip?.availableSeats && seats > trip.availableSeats) {
      setSeats(Math.max(1, trip.availableSeats));
    }
  }, [seats, trip]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-4 py-20">
          <LoadingPanel label="Loading trip details..." />
        </div>
      </MainLayout>
    );
  }

  if (error || !trip) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="rounded-2xl bg-error-container p-6 text-center font-semibold text-on-error-container">
            {error || "Trip not found"}
          </div>
        </div>
      </MainLayout>
    );
  }

  const tax = Math.round(seats * trip.pricePerPerson * 0.05);
  const subtotal = seats * trip.pricePerPerson;
  const total = subtotal + tax;
  const canBook = trip.availableSeats > 0 && pickupPointId;
  const bookingUrl = `/payment?tripId=${trip._id}&seats=${seats}&pickupPointId=${pickupPointId}`;
  const joinedCount = Math.max(0, Number(trip.totalSeats || 0) - Number(trip.availableSeats || 0));
  const occupancyPercent = trip.totalSeats
    ? Math.min(100, Math.round((joinedCount / Math.max(1, trip.totalSeats)) * 100))
    : 0;
  const canEditTrip =
    user?.role === "organizer" &&
    String(trip.organizerId?.userId?._id || "") === String(user?._id || "");
  const activeHeroImage = optimizeCloudinaryImage(
    tripImages[activeImageIndex] || campfireImage,
    "f_auto,q_auto,w_1600",
  );

  return (
    <MainLayout withFooter={false}>
      <section className="relative h-[52vh] min-h-80 overflow-hidden sm:min-h-96">
        <img
          src={activeHeroImage}
          alt={trip.title}
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl p-5 text-white sm:p-8 md:p-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-on-secondary-container">
            <span className="material-symbols-outlined text-sm">star</span>
            Trending Expedition
          </p>
          <h1 className="mt-4 break-words font-headline text-xl font-extrabold leading-tight tracking-tight sm:text-2xl md:text-4xl lg:text-5xl">
            {trip.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-6 text-sm text-surface-variant">
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                calendar_today
              </span>
              {getTripDuration(trip.startDate, trip.endDate)}
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                location_on
              </span>
              {trip.destination}
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">group</span>
              {trip.availableSeats} Slots Left
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">diversity_3</span>
              {joinedCount} already joined
            </p>
          </div>
        </div>
        {tripImages.length > 1 ? (
          <>
            <button
              onClick={() =>
                setActiveImageIndex((current) =>
                  current === 0 ? tripImages.length - 1 : current - 1,
                )
              }
               className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm sm:left-4"
              aria-label="Previous trip image"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              onClick={() =>
                setActiveImageIndex((current) => (current + 1) % tripImages.length)
              }
               className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm sm:right-4"
              aria-label="Next trip image"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
             <div className="absolute bottom-3 right-3 hidden gap-2 sm:bottom-4 sm:right-4 sm:flex">
              {tripImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setActiveImageIndex(index)}
                   className={`h-10 w-14 overflow-hidden rounded-lg border-2 ${
                     index === activeImageIndex ? "border-secondary-container" : "border-white/30"
                   }`}
                  aria-label={`Open trip image ${index + 1}`}
                >
                  <img
                    src={optimizeCloudinaryImage(image, "f_auto,q_auto,w_220")}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <article className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-surface-container-low p-6 md:p-8">
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
                alt="Organizer"
                className="h-18 w-18 rounded-full border-4 border-surface-container-highest object-cover"
              />
              <div>
                <h3 className="font-headline text-lg font-bold text-primary">
                  {trip.organizerId?.businessName || "Verified Organizer"}
                </h3>
                <p className="text-sm text-outline">Trip Organizer</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canEditTrip ? (
                <Link
                  to={`/trips/${trip._id}/edit`}
                  className="rounded-xl bg-primary px-6 py-2 font-semibold text-white"
                >
                  Edit Trip
                </Link>
              ) : null}
              <button className="rounded-xl border border-primary/20 px-6 py-2 font-semibold text-primary hover:bg-primary hover:text-white">
                View Profile
              </button>
            </div>
          </article>

          <article>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-primary">
                  The Journey Map
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Tap each day to open the full plan like a package builder.
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                  Trip Flow
                </p>
                <p className="mt-1 font-headline text-lg font-black text-primary">
                  {itinerary.length} Days
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {itinerary.map((item) => {
                const isOpen = openDay === item.day;

                return (
                  <article
                    key={`${item.day}-${item.title}`}
                    className={`overflow-hidden rounded-3xl border transition ${
                      isOpen
                        ? "border-primary/20 bg-surface-container-lowest shadow-[0_18px_36px_rgba(16,58,45,0.08)]"
                        : "border-outline-variant/10 bg-surface-container-low"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDay((currentDay) => (currentDay === item.day ? 0 : item.day))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left md:px-6"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${
                            isOpen
                              ? "bg-primary text-white"
                              : "bg-surface-container-highest text-primary"
                          }`}
                        >
                          {String(item.day).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                            Day {item.day}
                          </p>
                          <h4 className="font-headline text-lg font-bold text-primary">
                            {item.title}
                          </h4>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary">
                        {isOpen ? "remove" : "add"}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-outline-variant/10 px-5 py-5 md:px-6">
                        <p className="leading-relaxed text-on-surface-variant">
                          {item.note}
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary-container p-8 text-surface-bright md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary-container/10 blur-3xl" />
            <h3 className="flex items-center gap-2 font-headline text-xl font-bold">
              <span className="material-symbols-outlined text-secondary-container">
                departure_board
              </span>
              Boarding Points
            </h3>
            <div className="mt-7 space-y-4">
              {tripDetails?.pickupPoints?.length
                ? tripDetails.pickupPoints.map((point, index) => (
                    <div
                      key={point._id}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-white/20 text-white"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{point.location}</p>
                          <p className="font-mono text-sm font-bold text-secondary-container">
                            {point.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </article>
        </div>

        <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-5">
              <div className="rounded-3xl border border-primary/10 bg-linear-to-br from-[#173f31] to-[#0f3327] p-6 text-white shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Group Energy
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-headline text-3xl font-black leading-none">
                      {joinedCount}
                    </p>
                    <p className="mt-2 text-sm text-white/80">
                      people already joined this trip
                    </p>
                  </div>
                  <span className="rounded-full bg-white/12 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
                    {occupancyPercent}% filled
                  </span>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <p className="mt-4 text-sm text-white/80">
                  Book your seat to join the group trip chat and travel with the same crew.
                </p>
              </div>

              <div className="overflow-hidden rounded-4xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
              <div className="space-y-6 p-8 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-outline">Price per seat</p>
                    <p className="font-headline text-2xl font-black text-primary">
                      {formatINR(trip.pricePerPerson)}
                    </p>
                  </div>
                  <p className="rounded-lg bg-error-container px-3 py-1 text-[10px] font-black uppercase text-on-error-container">
                    Limited Seats
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Build Your Spot
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                    <button
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}
                      className="h-12 w-12 rounded-lg bg-surface text-lg font-bold text-primary"
                    >
                      -
                    </button>
                    <span className="font-headline text-xl font-bold text-primary">
                      {String(seats).padStart(2, "0")}
                    </span>
                    <button
                      onClick={() =>
                        setSeats((s) => Math.min(Math.max(1, trip.availableSeats), s + 1))
                      }
                      className="h-12 w-12 rounded-lg bg-primary-container text-lg font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Pickup Point
                  </p>
                  <select
                    value={pickupPointId}
                    onChange={(event) => setPickupPointId(event.target.value)}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary"
                  >
                    {pickupOptions.map((point) => (
                      <option key={point.value} value={point.value}>
                        {point.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 border-t border-outline-variant/20 pt-5 text-sm">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Subtotal ({seats} seats)</span>
                    <span className="font-bold text-primary">
                      {formatINR(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Tax and Service Fee</span>
                    <span className="font-bold text-primary">
                      {formatINR(tax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-extrabold text-primary">
                    <span>Total Amount</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Why Book Now
                      </p>
                      <p className="mt-2 text-sm font-semibold text-primary">
                        Join a live group trip, not a static package.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary">bolt</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    <li>{joinedCount} travelers already in</li>
                    <li>{trip.availableSeats} seats still available</li>
                    <li>Trip group chat unlocks after booking</li>
                  </ul>
                </div>

                {isLoggedIn ? (
                  <Link
                    to={bookingUrl}
                    className={`block rounded-2xl px-5 py-4 text-center font-headline text-lg font-extrabold shadow-[0_8px_24px_rgba(253,157,26,0.25)] ${
                      canBook
                        ? "bg-linear-to-br from-secondary to-secondary-container text-on-secondary-container"
                        : "pointer-events-none bg-surface-container-high text-outline"
                    }`}
                  >
                    {trip.availableSeats > 0 ? "BOOK YOUR SEAT" : "SOLD OUT"}
                  </Link>
                ) : (
                  <Link
                    to="/auth?mode=login"
                    className="block rounded-2xl bg-linear-to-br from-secondary to-secondary-container px-5 py-4 text-center font-headline text-lg font-extrabold text-on-secondary-container shadow-[0_8px_24px_rgba(253,157,26,0.25)]"
                  >
                    LOGIN TO BOOK
                  </Link>
                )}
              </div>

              <div className="bg-surface-container-high p-4 text-center text-[10px] text-outline">
                Free cancellation until 48 hours before departure
              </div>
            </div>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}
