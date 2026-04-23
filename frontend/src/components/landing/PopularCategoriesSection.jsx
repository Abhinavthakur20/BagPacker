export default function PopularCategoriesSection({ tripTypes, onExplore }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-base font-bold uppercase tracking-[0.2em] text-secondary">
            Popular Categories
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {tripTypes.map((tripType) => (
          <article
            key={tripType.title}
            className="group relative overflow-hidden rounded-3xl border border-outline-variant/40 shadow-[0_12px_30px_rgba(28,28,24,0.12)] transition hover:-translate-y-1"
          >
            <img
              src={tripType.image}
              alt={tripType.title}
              loading="lazy"
              decoding="async"
              className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="inline-flex rounded-full bg-secondary-fixed/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-secondary-container">
                {tripType.badge}
              </span>
              <h3 className="mt-3 font-headline text-lg font-bold text-white">
                {tripType.title}
              </h3>
              <p className="mt-1 min-h-10 text-sm text-white/90">
                {tripType.subtitle}
              </p>
              <button
                type="button"
                onClick={onExplore}
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-secondary-container"
              >
                Explore trips
                <span className="material-symbols-outlined text-base transition group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
