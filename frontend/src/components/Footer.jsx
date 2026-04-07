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
    <footer className="mt-20 border-t border-white/10 bg-primary text-surface">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-headline text-3xl font-extrabold text-secondary-container">
              BagPacker
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-surface/85">
              Discover trusted expeditions, verified organizers, and compatible
              travel companions across India. Plan smarter, travel safer.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
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

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
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
            <div className="grid gap-8 md:grid-cols-3">
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
              <div className="flex flex-wrap gap-4 text-surface/90">
                {socialLinks.map((item) => (
                  <button key={item} className="hover:text-secondary-container">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-surface/70 md:flex-row md:items-center md:justify-between">
          <p>© {year} BagPacker Expedition Tech. All rights reserved.</p>
          <p>Built for modern Indian explorers.</p>
        </div>
      </div>
    </footer>
  );
}
