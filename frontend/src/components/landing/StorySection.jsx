export default function StorySection({ campfireImage }) {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center gap-14 px-6 py-16 md:flex-row">
      <div className="relative w-full flex-1">
        <div className="overflow-hidden rounded-[2.2rem] shadow-2xl transition-transform duration-500 md:rotate-2 md:hover:rotate-0">
          <img
            src={campfireImage}
            alt="Travelers at campfire"
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-6 -left-2 max-w-[180px] rounded-3xl bg-secondary-container p-4 shadow-xl md:-left-6">
          <p className="text-xs font-medium text-on-secondary-container">
            <span className="material-symbols-outlined mb-1 block text-lg">
              verified_user
            </span>
            TrustScore verified for all group trips
          </p>
        </div>
      </div>

      <div className="w-full flex-1">
        <h2 className="font-headline text-3xl font-extrabold leading-tight text-primary">
          The smarter way to see the world.
        </h2>
        <p className="mt-6 max-w-xl leading-relaxed text-on-surface-variant">
          BagPacker is more than a booking platform. It is a social layer for
          travel. We vet our organizers and verify traveler identities so you
          can focus on the mountains, not the logistics.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <button className="rounded-xl bg-primary px-8 py-3 font-bold text-white shadow-lg hover:bg-primary-container">
            Start Your Journey
          </button>
          <button className="rounded-xl border border-outline-variant px-8 py-3 font-semibold text-primary hover:border-primary">
            How it Works
          </button>
        </div>
      </div>
    </section>
  );
}
