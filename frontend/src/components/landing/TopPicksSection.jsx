import { useNavigate } from "react-router-dom";
import { optimizeCloudinaryImage } from "../../lib/api";
import fallbackImage from "../../assets/images/landing/story/HomeDesign.webp";

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return amount > 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "INR TBD";
};

const getTripDurationLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return "TBD";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "TBD";

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const nights = Math.max(0, diffDays - 1);

  return `${diffDays}D / ${nights}N`;
};

export default function TopPicksSection({ trips = [], isLoading = false, error = "" }) {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Top Picks
        </p>
      </div>
      <h2 className="mb-3 font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
        Our Tour Packages You&apos;ll Love
      </h2>
      <p className="mb-10 max-w-lg text-on-surface-variant">
        Plan, book, and embark on your dream adventure with our expert guidance
        and tailored experiences.
      </p>

      {error ? (
        <div className="rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">
          {error}
        </div>
      ) : isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 w-full animate-pulse rounded-3xl bg-surface-container" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trips.length > 0 ? (
            trips.map((trip) => {
              const mainImage = Array.isArray(trip.images) && trip.images[0] ? trip.images[0] : "";
              const optimizedImage = mainImage
                ? optimizeCloudinaryImage(mainImage, "f_auto,q_auto,w_800")
                : fallbackImage;

              return (
                <article
                  key={trip._id}
                  className="group cursor-pointer overflow-hidden rounded-3xl shadow-[0_8px_30px_rgba(28,28,24,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(28,28,24,0.16)]"
                  onClick={() => navigate(`/trips/${trip._id}`)}
                >
                  <div className="relative h-80 overflow-hidden">
                    <img
                      src={optimizedImage}
                      alt={trip.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

                    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-white/90">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          {trip.views || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">share</span>
                          {trip.shares || 0}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                        {getTripDurationLabel(trip.startDate, trip.endDate)}
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Starting from
                      </p>
                      <p className="mt-0.5 font-headline text-2xl font-black text-white">
                        {formatPrice(trip.pricePerPerson)}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-bold text-white/90">
                        {trip.title} · {trip.destination}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="col-span-full py-10 text-center text-on-surface-variant">
              No top picks available at the moment.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
