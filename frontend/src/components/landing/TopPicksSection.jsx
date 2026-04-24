import spitiImage from "../../assets/images/landing/top-picks/spiti.webp";
import goaImage from "../../assets/images/landing/top-picks/goa.webp";
import jaipurImage from "../../assets/images/landing/top-picks/jaipur.webp";

const topPicks = [
  {
    title: "Spiti Valley Road Odyssey",
    location: "Himachal Pradesh",
    duration: "7D / 6N",
    price: "INR 18,999",
    image: spitiImage,
    views: "2,332",
    shares: "50",
  },
  {
    title: "Goa Coastal Escape",
    location: "Goa",
    duration: "4D / 3N",
    price: "INR 12,499",
    image: goaImage,
    views: "1,847",
    shares: "38",
  },
  {
    title: "Jaipur Heritage Weekend",
    location: "Rajasthan",
    duration: "3D / 2N",
    price: "INR 9,499",
    image: jaipurImage,
    views: "3,120",
    shares: "65",
  },
];

export default function TopPicksSection({ onExplore }) {
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

      {/* ── Tour package cards (reference style with overlay info) ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {topPicks.map((trip) => (
          <article
            key={trip.title}
            className="group cursor-pointer overflow-hidden rounded-3xl shadow-[0_8px_30px_rgba(28,28,24,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(28,28,24,0.16)]"
            onClick={onExplore}
          >
            {/* ── Card image with overlay ── */}
            <div className="relative h-80 overflow-hidden">
              <img
                src={trip.image}
                alt={trip.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

              {/* Top bar: stats + duration */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-3 text-[11px] font-semibold text-white/90">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    {trip.views}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">share</span>
                    {trip.shares}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  {trip.duration}
                </span>
              </div>

              {/* Bottom bar: price + location */}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-medium text-white/70">
                  Starts from (per person)
                </p>
                <p className="mt-0.5 font-headline text-xl font-extrabold text-white">
                  {trip.price}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {trip.title} · {trip.location}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
