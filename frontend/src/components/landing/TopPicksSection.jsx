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
  },
  {
    title: "Goa Coastal Escape",
    location: "Goa",
    duration: "4D / 3N",
    price: "INR 12,499",
    image: goaImage,
  },
  {
    title: "Jaipur Heritage Weekend",
    location: "Rajasthan",
    duration: "3D / 2N",
    price: "INR 9,499",
    image: jaipurImage,
  },
];

export default function TopPicksSection({ onExplore }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="mb-7">
        <p className="text-base font-bold uppercase tracking-[0.2em] text-secondary">
          Top Picks
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {topPicks.map((trip) => (
          <article
            key={trip.title}
            className="overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_12px_30px_rgba(28,28,24,0.08)] transition hover:-translate-y-1"
          >
            <img
              src={trip.image}
              alt={trip.title}
              loading="lazy"
              decoding="async"
              className="h-52 w-full object-cover"
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-headline text-2xl font-bold text-primary">
                  {trip.title}
                </h3>
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-primary">
                  {trip.duration}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant">{trip.location}</p>

              <div className="flex items-center justify-between">
                <p className="text-sm text-on-surface-variant">
                  Starts from{" "}
                  <span className="font-bold text-primary">{trip.price}</span>
                </p>
                <button
                  type="button"
                  onClick={onExplore}
                  className="inline-flex items-center gap-1 text-sm font-bold text-secondary"
                >
                  View
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
