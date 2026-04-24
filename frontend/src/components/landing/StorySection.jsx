export default function StorySection({ campfireImage }) {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center gap-14 px-6 py-20 md:flex-row">
      <div className="relative w-full flex-1">
        <div className="overflow-hidden rounded-[2rem] shadow-[0_20px_60px_rgba(28,28,24,0.15)] transition-transform duration-500 md:rotate-1 md:hover:rotate-0">
          <img
            src={campfireImage}
            alt="Travelers at campfire"
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-5 -left-2 flex items-start gap-3 rounded-2xl border border-outline-variant/20 bg-white p-4 shadow-[0_8px_30px_rgba(28,28,24,0.12)] md:-left-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed">
            <span className="material-symbols-outlined text-lg text-primary">
              verified_user
            </span>
          </span>
          <div className="max-w-[150px]">
            <p className="text-xs font-bold text-on-surface">Trust Verified</p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">
              TrustScore verified for all group trips
            </p>
          </div>
        </div>
      </div>

      <div className="w-full flex-1">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Our Story
        </p>
        <h2 className="font-headline text-3xl font-extrabold leading-tight text-primary md:text-4xl">
          The smarter way to see the world.
        </h2>
        <p className="mt-6 max-w-xl leading-relaxed text-on-surface-variant">
          BagPacker is more than a booking platform. It is a social layer for
          travel. We vet our organizers and verify traveler identities so you
          can focus on the mountains, not the logistics.
        </p>

        {/* ── Quick highlights ── */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            ["shield", "Verified Organizers"],
            ["payments", "Secure Payments"],
            ["headset_mic", "24×7 Support"],
            ["groups", "Group Matching"],
          ].map(([icon, label]) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3"
            >
              <span className="material-symbols-outlined text-lg text-secondary">
                {icon}
              </span>
              <span className="text-sm font-semibold text-on-surface">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button className="rounded-xl bg-primary px-8 py-3.5 font-bold text-white shadow-[0_4px_16px_rgba(1,45,29,0.25)] transition hover:shadow-[0_8px_30px_rgba(1,45,29,0.35)] active:scale-[0.98]">
            Start Your Journey
          </button>
          <button className="rounded-xl border border-outline-variant px-8 py-3.5 font-semibold text-primary transition hover:border-primary hover:bg-primary-fixed/30">
            How it Works
          </button>
        </div>
      </div>
    </section>
  );
}
