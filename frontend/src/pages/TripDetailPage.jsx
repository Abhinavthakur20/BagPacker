import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function TripDetailPage() {
  const { id } = useParams();
  const [tripDetails, setTripDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [seats, setSeats] = useState(2);
  const [pickupPoint, setPickupPoint] = useState("");

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await api.get(`/trips/${id}`);
        setTripDetails(response);

        if (response?.pickupPoints?.length) {
          setPickupPoint(response.pickupPoints[0].location);
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  const trip = tripDetails?.trip;
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
      return tripDetails.pickupPoints.map((point) => point.location);
    }

    return ["Main Pickup Point"];
  }, [tripDetails]);

  useEffect(() => {
    if (!pickupPoint && pickupOptions.length) {
      setPickupPoint(pickupOptions[0]);
    }
  }, [pickupOptions, pickupPoint]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-on-surface-variant">
          Loading trip details...
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

  return (
    <MainLayout withFooter={false}>
      <section className="relative h-[52vh] min-h-96 overflow-hidden">
        <img
          src={campfireImage}
          alt={trip.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl p-8 text-white md:p-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-on-secondary-container">
            <span className="material-symbols-outlined text-sm">star</span>
            Trending Expedition
          </p>
          <h1 className="mt-4 font-headline text-5xl font-extrabold leading-none tracking-tight md:text-7xl">
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
          </div>
        </div>
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
                <h3 className="font-headline text-2xl font-bold text-primary">
                  {trip.organizerId?.businessName || "Verified Organizer"}
                </h3>
                <p className="text-sm text-outline">Trip Organizer</p>
              </div>
            </div>
            <button className="rounded-xl border border-primary/20 px-6 py-2 font-semibold text-primary hover:bg-primary hover:text-white">
              View Profile
            </button>
          </article>

          <article>
            <h2 className="mb-8 font-headline text-4xl font-extrabold text-primary">
              The Journey Map
            </h2>
            <div className="relative space-y-8 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-[2px] before:bg-outline-variant/50">
              {itinerary.map((item, index) => (
                <div
                  key={`${item.day}-${item.title}`}
                  className="relative pl-12"
                >
                  <span
                    className={`absolute left-0 top-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      index === 0
                        ? "bg-primary-container text-white"
                        : "border-2 border-primary-container bg-surface-container-highest text-primary"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6">
                    <h4 className="font-headline text-2xl font-bold text-primary">
                      Day {item.day}: {item.title}
                    </h4>
                    <p className="mt-2 leading-relaxed text-on-surface-variant">
                      {item.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary-container p-8 text-surface-bright md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary-container/10 blur-3xl" />
            <h3 className="flex items-center gap-2 font-headline text-3xl font-bold">
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
            <div className="overflow-hidden rounded-4xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
              <div className="space-y-6 p-8 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-outline">Price per seat</p>
                    <p className="font-headline text-4xl font-black text-primary">
                      {formatINR(trip.pricePerPerson)}
                    </p>
                  </div>
                  <p className="rounded-lg bg-error-container px-3 py-1 text-[10px] font-black uppercase text-on-error-container">
                    Limited Seats
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Number of Seats
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                    <button
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}
                      className="h-10 w-10 rounded-lg bg-surface text-lg font-bold text-primary"
                    >
                      -
                    </button>
                    <span className="font-headline text-3xl font-bold text-primary">
                      {String(seats).padStart(2, "0")}
                    </span>
                    <button
                      onClick={() => setSeats((s) => Math.min(9, s + 1))}
                      className="h-10 w-10 rounded-lg bg-primary-container text-lg font-bold text-white"
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
                    value={pickupPoint}
                    onChange={(event) => setPickupPoint(event.target.value)}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary"
                  >
                    {pickupOptions.map((point) => (
                      <option key={point}>{point}</option>
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

                <Link
                  to="/payment"
                  className="block rounded-2xl bg-linear-to-br from-secondary to-secondary-container px-5 py-4 text-center font-headline text-lg font-extrabold text-on-secondary-container shadow-[0_8px_24px_rgba(253,157,26,0.25)]"
                >
                  BOOK YOUR SEAT
                </Link>
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
