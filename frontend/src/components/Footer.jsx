const footerLinks = [
  "About Us",
  "Verified Organizers",
  "Trip Safety",
  "Privacy Policy",
  "Terms of Service",
  "Support",
  "Careers",
];

const tripStyles = [
  "Weekend Getaways",
  "Backpacking Circuits",
  "Adventure Treks",
  "Spiritual Yatras",
  "Group Departures",
  "Custom Corporate Trips",
];

const resources = [
  "Cancellation Policy",
  "Refund Policy",
  "Traveler Guidelines",
  "Organizer Handbook",
  "Community Standards",
  "Safety Helpline",
];

const socialLinks = ["Instagram", "YouTube", "X", "LinkedIn"];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-white/10 bg-primary text-surface md:mt-20">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-8 md:gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1.5">
                <img src="/logo.png" alt="" className="h-full w-full object-contain" />
              </div>
              <p className="font-headline text-3xl font-extrabold tracking-tighter text-secondary-container">
                BagPacker
              </p>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-surface/85">
              Discover trusted expeditions, verified organizers, and compatible
              travel companions across India. Plan smarter, travel safer.
            </p>
            <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
              {["Organizer Verified", "Secure Payments", "24x7 Support"].map(
                (pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-surface/90"
                  >
                    {pill}
                  </span>
                ),
              )}
            </div>

            <div className="mt-5 hidden rounded-2xl border border-white/15 bg-white/5 p-4 sm:block">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-container">
                Get Weekly Trip Drops
              </p>
              <p className="mt-2 text-xs text-surface/75">
                Join our travel list for verified deals, departure alerts, and
                route updates.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs placeholder:text-surface/50 focus:outline-none"
                />
                <button className="rounded-lg bg-secondary-container px-3 py-2 text-xs font-bold text-on-secondary-container">
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="space-y-3 md:hidden">
              <details className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Trip Categories
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-surface/90">
                  {tripStyles.map((item) => (
                    <button
                      key={item}
                      className="text-left hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </details>

              <details className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Quick Links
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-surface/90">
                  {footerLinks.map((link) => (
                    <button
                      key={link}
                      className="text-left hover:text-secondary-container"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </details>

              <details className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Resources
                </summary>
                <div className="mt-3 grid gap-2 text-sm text-surface/85">
                  {resources.map((item) => (
                    <button
                      key={item}
                      className="text-left hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <div className="hidden gap-8 md:grid md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Trip Categories
                </p>
                <div className="mt-4 space-y-2 text-sm text-surface/90">
                  {tripStyles.map((item) => (
                    <button
                      key={item}
                      className="block text-left hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Quick Links
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-surface/90">
                  {footerLinks.map((link) => (
                    <button
                      key={link}
                      className="text-left hover:text-secondary-container"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
                  Resources
                </p>
                <div className="mt-4 space-y-2 text-sm text-surface/85">
                  {resources.map((item) => (
                    <button
                      key={item}
                      className="block text-left hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 lg:col-span-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
              Contact & Community
            </p>
            <div className="mt-3 flex flex-col gap-3 text-sm text-surface/85 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p>help@bagpacker.in | +91-80000-12345</p>
                <p>Mon - Sat, 9:00 AM to 7:00 PM</p>
              </div>
              <div className="flex flex-wrap gap-3 text-surface/90 md:gap-4">
                {socialLinks.map((item) => (
                  <button key={item} className="hover:text-secondary-container">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-surface/70 md:mt-10 md:flex-row md:items-center md:justify-between md:pt-5">
          <p>© {year} BagPacker Expedition Tech. All rights reserved.</p>
          <p>Built for modern Indian explorers.</p>
        </div>
      </div>
    </footer>
  );
}
