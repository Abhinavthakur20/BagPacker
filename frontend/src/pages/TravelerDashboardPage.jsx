import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import { trips } from "../data/mockData";

export default function TravelerDashboardPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
              Namaste, Rohan!
            </h1>
            <p className="text-on-surface-variant">
              Ready for your next expedition?
            </p>
          </div>
          <Link
            to="/trips/search"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg"
          >
            Explore Trips
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl bg-linear-to-r from-primary to-primary-container px-6 py-9 md:px-10">
          <div className="grid gap-8 text-center md:grid-cols-3">
            <div>
              <p className="font-headline text-6xl font-extrabold tracking-tight text-secondary-container">
                10,000+
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
                Verified Travelers
              </p>
            </div>
            <div className="border-y border-white/10 py-6 md:border-x md:border-y-0 md:py-0">
              <p className="font-headline text-6xl font-extrabold tracking-tight text-secondary-container">
                500+
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
                Active Organizers
              </p>
            </div>
            <div>
              <p className="font-headline text-6xl font-extrabold tracking-tight text-secondary-container">
                25,000+
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
                Trips Completed
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            ["Upcoming Expeditions", "03", "event_available"],
            ["Companion Requests", "07", "person_add"],
            ["Trust Score", "94", "verified_user"],
          ].map(([label, value, icon]) => (
            <article
              key={label}
              className="rounded-2xl bg-surface-container-lowest p-7 shadow-[0_12px_32px_rgba(28,28,24,0.06)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="material-symbols-outlined rounded-xl bg-primary-fixed p-2 text-primary">
                  {icon}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                  Live
                </span>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-outline">
                {label}
              </p>
              <p className="mt-2 font-headline text-5xl font-extrabold text-primary">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
                Recommended for You
              </h2>
              <p className="text-on-surface-variant">
                Based on your interest in high-altitude journeys
              </p>
            </div>
            <Link
              to="/trips/search"
              className="text-sm font-bold text-secondary hover:underline"
            >
              View all trips
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(28,28,24,0.08)]"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={trip.heroImage}
                    alt={trip.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-primary/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {trip.route}
                  </span>
                </div>

                <div className="space-y-3 p-5">
                  <h3 className="font-headline text-xl font-bold text-primary">
                    {trip.title}
                  </h3>
                  <div className="grid gap-2 text-sm text-on-surface-variant">
                    <p className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-secondary">
                        calendar_today
                      </span>
                      {new Date(trip.date).toLocaleDateString("en-IN")}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-secondary">
                        event_seat
                      </span>
                      {trip.seatsLeft} seats left
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                    <p className="font-headline text-xl font-black text-primary">
                      {trip.price.toLocaleString("en-IN")}
                    </p>
                    <Link
                      to={`/trips/${trip.id}`}
                      className="rounded-xl bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
