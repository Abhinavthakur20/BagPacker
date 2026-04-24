export default function PopularCategoriesSection({ tripTypes, onExplore }) {
  // Asymmetric grid: first item is tall (spans 2 rows), the rest fill the right column
  const [first, ...rest] = tripTypes;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Traveler&apos;s Favourite
        </p>
      </div>
      <h2 className="mb-3 font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
        Explore All Popular Categories
      </h2>
      <p className="mb-10 max-w-lg text-on-surface-variant">
        Plan, book, and embark on your dream adventure with our expert guidance
        and tailored experiences.
      </p>

      {/* ── Asymmetric grid like reference ── */}
      <div className="grid gap-5 md:grid-cols-2 md:grid-rows-2">
        {/* Large card — spans 2 rows */}
        <article
          className="group relative row-span-2 overflow-hidden rounded-3xl shadow-[0_8px_30px_rgba(28,28,24,0.12)] transition-all duration-300 hover:shadow-[0_16px_48px_rgba(28,28,24,0.18)]"
          style={{ minHeight: "420px" }}
        >
          <img
            src={first.image}
            alt={first.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7">
            <span className="inline-flex rounded-full bg-secondary-container/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-secondary-container backdrop-blur-sm">
              {first.badge}
            </span>
            <h3 className="mt-3 font-headline text-2xl font-bold text-white">
              {first.title}
            </h3>
            <p className="mt-1 text-sm text-white/85">{first.subtitle}</p>
            <button
              type="button"
              onClick={onExplore}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-secondary-container transition-all group-hover:gap-2.5"
            >
              Explore trips
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </article>

        {/* Right column cards */}
        {rest.map((tripType) => (
          <article
            key={tripType.title}
            className="group relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgba(28,28,24,0.12)] transition-all duration-300 hover:shadow-[0_16px_48px_rgba(28,28,24,0.18)]"
            style={{ minHeight: "200px" }}
          >
            <img
              src={tripType.image}
              alt={tripType.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="font-headline text-xl font-bold text-white">
                {tripType.title}
              </h3>
              <p className="mt-1 text-sm text-white/85">{tripType.subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
