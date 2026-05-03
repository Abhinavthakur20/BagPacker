import { useEffect, useState } from "react";
import CityAutocompleteInput from "../ui/CityAutocompleteInput";

const heroSlides = [
  {
    image: "https://images.pexels.com/photos/34358628/pexels-photo-34358628.jpeg",
    label: "Himalayan Trails",
    eyebrow: "Spiti, Himachal",
    note: "Small-group departures with verified organizers",
  },
  {
    image: "https://images.pexels.com/photos/31044093/pexels-photo-31044093.jpeg",
    label: "Coastal Escapes",
    eyebrow: "Goa, Konkan",
    note: "Beach stays, shared routes, and flexible seats",
  },
  {
    image: "https://images.pexels.com/photos/25786565/pexels-photo-25786565.jpeg",
    label: "Forest Retreats",
    eyebrow: "Wayanad, Kerala",
    note: "Nature stays matched with trusted travelers",
  },
  {
    image: "https://images.pexels.com/photos/5185614/pexels-photo-5185614.jpeg",
    label: "Desert Adventures",
    eyebrow: "Jaisalmer, Rajasthan",
    note: "Curated desert trails with ready-to-join crews",
  },
];

const trustSignals = [
  ["verified_user", "Verified organizers"],
  ["groups", "Companion matching"],
  ["payments", "Secure bookings"],
];

export default function LandingHeroSection({ form, setForm, onSubmit }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = heroSlides[activeImageIndex];

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
      className="relative overflow-hidden bg-surface"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <div className="flex items-center px-5 py-10 sm:px-8 lg:px-14 xl:px-24">
          <div className="w-full max-w-2xl">


          <h1 className="font-headline text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl xl:text-6xl">
            Group trips worth joining.
            <span className="block text-secondary">
              People worth meeting.
            </span>
          </h1>


          <div className="mt-6 grid grid-cols-3 gap-2">
            {trustSignals.map(([icon, label]) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-outline-variant/45 bg-surface-container-lowest px-2 py-3 shadow-sm sm:flex-row sm:justify-start sm:gap-3 sm:px-3"
              >
                <span className="material-symbols-outlined text-base text-secondary sm:text-lg">
                  {icon}
                </span>
                <span className="text-[9px] font-bold leading-tight text-primary sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-7 overflow-hidden rounded-lg border border-outline-variant/45 bg-surface-container-lowest shadow-[0_20px_60px_rgba(28,28,24,0.12)]"
          >
            <div className="grid grid-cols-2 gap-0">
              <label className="group flex min-h-[72px] items-center gap-2 border-b border-r border-outline-variant/30 px-3 py-3 text-left transition sm:min-h-20 sm:gap-3 sm:px-5">
                <span className="material-symbols-outlined text-xl text-secondary">
                  location_on
                </span>
                <span className="block w-full">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
                    From
                  </span>
                  <CityAutocompleteInput
                    placeholder="Starting City"
                    value={form.from}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, from: e.target.value }))
                    }
                    className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-outline-variant"
                  />
                </span>
              </label>

              <label className="group flex min-h-[72px] items-center gap-2 border-b border-outline-variant/30 px-3 py-3 text-left transition sm:min-h-20 sm:gap-3 sm:px-5">
                <span className="material-symbols-outlined text-xl text-secondary">
                  near_me
                </span>
                <span className="block w-full">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-outline">
                    To
                  </span>
                  <CityAutocompleteInput
                    placeholder="Destination"
                    value={form.to}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, to: e.target.value }))
                    }
                    className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-outline-variant"
                  />
                </span>
              </label>

              <label className="group flex min-h-[72px] items-center gap-2 border-r border-outline-variant/30 px-3 py-3 text-left transition sm:min-h-20 sm:gap-3 sm:px-5">
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

              <button className="flex min-h-[72px] items-center justify-center gap-1 bg-secondary px-4 py-3 font-bold text-white transition hover:bg-secondary/90 active:scale-[0.98] sm:min-h-20 sm:gap-2 sm:px-8">
                <span className="material-symbols-outlined text-lg">search</span>
                Search trips
              </button>
            </div>
          </form>
          </div>
        </div>

        <div className="relative min-h-[430px] overflow-hidden bg-primary lg:min-h-[calc(100vh-4rem)]">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.label}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-out ${
                index === activeImageIndex
                  ? "scale-105 opacity-100"
                  : "scale-100 opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />

          <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3 sm:left-8 sm:right-8 sm:top-8">
            <div className="rounded-full border border-white/25 bg-black/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              {activeSlide.eyebrow}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToSlide(activeImageIndex - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/20"
                aria-label="Previous hero image"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeImageIndex + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/20"
                aria-label="Next hero image"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-secondary-container">
                Featured route
              </p>
              <h2 className="mt-2 font-headline text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                {activeSlide.label}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/82 sm:text-base">
                {activeSlide.note}
              </p>
            </div>

            <div className="mt-7 flex items-center justify-between gap-5">
              <div className="flex w-40 items-center gap-1.5 sm:w-52">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.label}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`group relative h-1.5 flex-1 overflow-hidden rounded-full transition ${
                      index === activeImageIndex
                        ? "bg-white/40"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                    aria-label={`Show ${slide.label}`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full bg-secondary-container transition-all ${
                        index === activeImageIndex
                          ? "w-full duration-[3000ms]"
                          : "w-0 duration-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-white/20 bg-white/[0.12] px-4 py-3 text-right text-white backdrop-blur-md">
                <p className="text-2xl font-extrabold">4.8/5</p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                  traveler rating
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
