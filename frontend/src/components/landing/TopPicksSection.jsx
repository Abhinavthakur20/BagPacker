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
                  className="group cursor-pointer overflow-hidden rounded-[2rem] border border-outline-variant/15 bg-surface-container-lowest shadow-[0_8px_30px_rgba(28,28,24,0.05)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(1,45,29,0.15)]"
                  onClick={() => navigate(`/trips/${trip._id}`)}
                >
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={optimizedImage}
                      alt={trip.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Top glassmorphic badges */}
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                      <div className="flex items-center gap-2.5 rounded-full bg-black/25 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-md border border-white/10">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          {trip.views || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">share</span>
                          {trip.shares || 0}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10">
                        <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                        {getTripDurationLabel(trip.startDate, trip.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="flex flex-col gap-3 p-6">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">distance</span>
                      {trip.destination || "Adventure"}
                    </div>

                    <h3 className="line-clamp-1 font-headline text-lg font-black text-on-surface transition-colors group-hover:text-secondary">
                      {trip.title}
                    </h3>

                    {/* Price and Action Footer */}
                    <div className="mt-2 flex items-end justify-between border-t border-outline-variant/10 pt-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                          Starting from
                        </p>
                        <p className="mt-0.5 font-headline text-2xl font-black text-primary">
                          {formatPrice(trip.pricePerPerson)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-secondary opacity-0 transition-all duration-300 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
                        Details
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </span>
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
