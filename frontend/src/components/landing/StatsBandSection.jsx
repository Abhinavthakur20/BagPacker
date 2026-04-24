const stats = [
  ["10,000+", "Verified Travelers", "group"],
  ["500+", "Active Organizers", "verified_user"],
  ["25,000+", "Trips Completed", "explore"],
];

export default function StatsBandSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-container py-16 text-center">
      {/* ── Background pattern ── */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="relative mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-3">
        {stats.map(([count, label, icon], index) => (
          <div
            key={label}
            className={`flex flex-col items-center space-y-2 ${
              index === 1
                ? "border-y border-white/10 py-6 md:border-x md:border-y-0 md:py-0"
                : ""
            }`}
          >
            <span className="material-symbols-outlined mb-1 text-3xl text-secondary-container/70">
              {icon}
            </span>
            <p className="font-headline text-4xl font-extrabold text-secondary-container">
              {count}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-container">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
