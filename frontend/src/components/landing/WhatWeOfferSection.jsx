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
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 border-t border-secondary/40" />
      <div className="mb-8">
        <p className="text-base font-bold uppercase tracking-[0.2em] text-secondary">
          What We Offer
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {offerCards.map(([title, desc, icon, cta]) => (
          <article
            key={title}
            className="rounded-3xl bg-surface-container-low p-8 shadow-[0_12px_32px_rgba(28,28,24,0.04)] transition hover:bg-surface-container-lowest"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed">
              <span className="material-symbols-outlined text-xl text-primary">
                {icon}
              </span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">
              {title}
            </h3>
            <p className="mt-4 text-on-surface-variant">{desc}</p>
            <button className="mt-7 flex items-center gap-2 text-sm font-bold text-secondary">
              {cta}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
