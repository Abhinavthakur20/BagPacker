import { useEffect, useState } from "react";

const heroSlides = [
  {
    image: "https://images.pexels.com/photos/24513295/pexels-photo-24513295.jpeg",
    label: "Himalayan Trails",
  },
  {
    image: "https://images.pexels.com/photos/5919573/pexels-photo-5919573.jpeg",
    label: "Coastal Escapes",
  },
  {
    image: "https://images.pexels.com/photos/4056105/pexels-photo-4056105.jpeg",
    label: "Forest Retreats",
  },
  {
    image: "https://images.pexels.com/photos/5185614/pexels-photo-5185614.jpeg",
    label: "Desert Adventures",
  },
];

export default function LandingHeroSection({ form, setForm, onSubmit }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = (index) => {
    setActiveImageIndex((index + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % heroSlides.length);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isPaused]);

  return (
    <section
      className="relative -mt-16 flex min-h-[100vh] items-center justify-center overflow-hidden pt-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Background slideshow ── */}
      {heroSlides.map((slide, index) => (
        <img
          key={slide.image}
          src={slide.image}
          alt={slide.label}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-out ${
            index === activeImageIndex ? "scale-105 opacity-100" : "scale-100 opacity-0"
          }`}
        />
      ))}

      {/* ── Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/20 to-surface/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* ── Arrows ── */}
      <button
        type="button"
        onClick={() => goToSlide(activeImageIndex - 1)}
        className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 md:left-8"
        aria-label="Previous hero image"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      <button
        type="button"
        onClick={() => goToSlide(activeImageIndex + 1)}
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 md:right-8"
        aria-label="Next hero image"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>

      {/* ── Hero content ── */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-10 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary-container" />
          {heroSlides[activeImageIndex].label}
        </div>

        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
          Find Your Tribe.
          <br />
          <span className="text-secondary-container">Split the Cost.</span>{" "}
          Travel Smart.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-white/85 md:text-lg">
          Connect with verified explorers, share expeditions across the Indian
          subcontinent, and make luxury travel accessible.
        </p>

        {/* ── Search bar (goexplore-style) ── */}
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        >
          <div className="grid gap-0 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="group flex items-center gap-3 border-b border-outline-variant/20 px-5 py-4 text-left transition md:border-b-0 md:border-r">
              <span className="material-symbols-outlined text-xl text-secondary">
                location_on
              </span>
              <span className="block w-full">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
                  From
                </span>
                <input
                  placeholder="Starting City"
                  value={form.from}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, from: e.target.value }))
                  }
                  className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-outline-variant"
                />
              </span>
            </label>

            <label className="group flex items-center gap-3 border-b border-outline-variant/20 px-5 py-4 text-left transition md:border-b-0 md:border-r">
              <span className="material-symbols-outlined text-xl text-secondary">
                near_me
              </span>
              <span className="block w-full">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
                  To
                </span>
                <input
                  placeholder="Destination"
                  value={form.to}
                  onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                  className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-outline-variant"
                />
              </span>
            </label>

            <label className="group flex items-center gap-3 border-b border-outline-variant/20 px-5 py-4 text-left transition md:border-b-0 md:border-r">
              <span className="material-symbols-outlined text-xl text-secondary">
                calendar_month
              </span>
              <span className="block w-full">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
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

            <button className="flex items-center justify-center gap-2 bg-secondary px-8 py-4 font-bold text-white transition hover:bg-secondary/90 active:scale-[0.98] md:rounded-none">
              <span className="material-symbols-outlined text-lg">search</span>
              Search
            </button>
          </div>
        </form>

        {/* ── Slide indicators ── */}
        <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center">
          <div className="flex w-40 items-center gap-1.5 sm:w-52">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.label}
                type="button"
                onClick={() => goToSlide(index)}
                className={`group relative h-1.5 flex-1 overflow-hidden rounded-full transition ${
                  index === activeImageIndex ? "bg-white/40" : "bg-white/20 hover:bg-white/30"
                }`}
                aria-label={`Show ${slide.label}`}
              >
                <span
                  className={`absolute inset-y-0 left-0 rounded-full bg-secondary-container transition-all ${
                    index === activeImageIndex ? "w-full duration-[3000ms]" : "w-0 duration-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
