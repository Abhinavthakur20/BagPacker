

export default function LandingHeroSection({ form, setForm, onSubmit }) {
  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden px-4">
      <img
        src="https://images.pexels.com/photos/34972220/pexels-photo-34972220.jpeg"
        alt="Himalayan sunrise"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-primary/70 via-primary/35 to-surface" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-surface" />

      <div className="relative mx-auto w-full max-w-5xl pt-10 text-center">
        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-white md:text-7xl">
          Find Your Tribe.
          <br />
          <span className="text-secondary-container">Split the Cost.</span>{" "}
          Travel Smart.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
          Connect with verified explorers, share expeditions across the Indian
          subcontinent, and make luxury travel accessible.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-10 grid max-w-5xl gap-2 rounded-2xl border border-surface/20 bg-surface-container-lowest p-2 shadow-2xl md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left">
            <span className="material-symbols-outlined text-outline">
              location_on
            </span>
            <span className="block w-full">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                From
              </span>
              <input
                placeholder="Starting City"
                value={form.from}
                onChange={(e) =>
                  setForm((p) => ({ ...p, from: e.target.value }))
                }
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              />
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left">
            <span className="material-symbols-outlined text-outline">
              near_me
            </span>
            <span className="block w-full">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                To
              </span>
              <input
                placeholder="Destination"
                value={form.to}
                onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              />
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left">
            <span className="material-symbols-outlined text-outline">
              calendar_month
            </span>
            <span className="block w-full">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                Travel Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none"
              />
            </span>
          </label>

          <button className="flex items-center justify-center gap-1 rounded-xl bg-primary px-8 py-3 font-bold text-white hover:bg-primary-container">
            Search
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
