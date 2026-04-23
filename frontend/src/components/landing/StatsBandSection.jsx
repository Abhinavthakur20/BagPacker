const stats = [
  ["10,000+", "Verified Travelers"],
  ["500+", "Active Organizers"],
  ["25,000+", "Trips Completed"],
];

export default function StatsBandSection() {
  return (
    <section className="relative overflow-hidden bg-linear-to-r from-primary to-primary-container py-14 text-center">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
        {stats.map(([count, label], index) => (
          <div
            key={label}
            className={`space-y-1 ${index === 1 ? "border-y border-white/10 py-5 md:border-x md:border-y-0" : ""}`}
          >
            <p className="font-headline text-3xl font-extrabold text-secondary-container">
              {count}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
