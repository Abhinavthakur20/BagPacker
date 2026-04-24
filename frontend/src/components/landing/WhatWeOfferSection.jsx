const offerCards = [
  [
    "Book Organized Trips",
    "Join professionally curated expeditions led by local experts. Everything from stays to permits handled seamlessly.",
    "calendar_today",
    "Explore curated trips",
  ],
  [
    "Find a Travel Companion",
    "Do not wait for friends to say yes. Connect with solo travelers heading to the same valley and split the costs.",
    "group",
    "Find your tribe",
  ],
  [
    "List Your Agency",
    "Are you a local expert or travel agency? Reach thousands of active explorers and grow your adventure business.",
    "business_center",
    "Partner with us",
  ],
];

export default function WhatWeOfferSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          What We Offer
        </p>
      </div>
      <h2 className="mb-3 font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
        Everything You Need to Travel Smarter
      </h2>
      <p className="mb-12 max-w-lg text-on-surface-variant">
        Plan, book, and embark on your dream adventure with our expert guidance
        and tailored experiences.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {offerCards.map(([title, desc, icon, cta]) => (
          <article
            key={title}
            className="group rounded-3xl border border-outline-variant/25 bg-surface-container-lowest p-8 shadow-[0_4px_24px_rgba(28,28,24,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(28,28,24,0.12)]"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed transition-transform duration-300 group-hover:scale-110">
              <span className="material-symbols-outlined text-xl text-primary">
                {icon}
              </span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">
              {title}
            </h3>
            <p className="mt-4 leading-relaxed text-on-surface-variant">{desc}</p>
            <button className="mt-7 flex items-center gap-2 text-sm font-bold text-secondary transition-all duration-200 group-hover:gap-3">
              {cta}
              <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
