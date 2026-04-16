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
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isPaused]);

  return (
    <section
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden px-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {heroSlides.map((slide, index) => (
        <img
          key={slide.image}
          src={slide.image}
          alt="Himalayan sunrise"
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-out ${
            index === activeImageIndex ? "scale-105 opacity-100" : "scale-100 opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-linear-to-b from-primary/58 via-primary/12 to-surface/72" />
      <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_52%)]" />
      <button
        type="button"
        onClick={() => goToSlide(activeImageIndex - 1)}
        className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white transition hover:bg-black/35 md:left-6 md:h-9 md:w-9"
        aria-label="Previous hero image"
      >
        <span className="material-symbols-outlined text-[16px] md:text-[18px]">chevron_left</span>
      </button>
      <button
        type="button"
        onClick={() => goToSlide(activeImageIndex + 1)}
        className="absolute right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white transition hover:bg-black/35 md:right-6 md:h-9 md:w-9"
        aria-label="Next hero image"
      >
        <span className="material-symbols-outlined text-[16px] md:text-[18px]">chevron_right</span>
      </button>

      <div className="relative mx-auto w-full max-w-5xl pt-10 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-primary/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          {heroSlides[activeImageIndex].label}
        </div>

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

        <div className="mx-auto mt-5 flex max-w-2xl items-center justify-center">
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
