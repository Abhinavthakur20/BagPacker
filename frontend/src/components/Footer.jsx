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
    <footer className="mt-16 border-t border-white/5 bg-primary text-surface md:mt-24">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5 border border-white/10">
                <img src="/logo.png" alt="BagPacker" className="h-full w-full object-contain" />
              </div>
              <p className="font-headline text-2xl font-black tracking-tight text-white">
                Bag<span className="text-secondary-container">Packer</span>
              </p>
            </div>
            
            <p className="max-w-sm text-sm leading-relaxed text-surface/80">
              Discover trusted expeditions, verified organizers, and compatible
              travel companions across India. Plan smarter, travel safer.
            </p>

            <div className="flex flex-wrap gap-2">
              {["Organizer Verified", "Secure Payments", "24x7 Support"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-surface/90"
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* Newsletter Glass Box */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                Get Weekly Trip Drops
              </p>
              <p className="mt-1.5 text-xs text-surface/70 leading-relaxed">
                Join our list for verified deals, departure alerts, and route updates.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-xs placeholder:text-surface/40 text-white outline-none focus:border-secondary-container/50 focus:bg-white/15 transition-all"
                />
                <button className="rounded-xl bg-secondary-container hover:bg-secondary-container/95 text-on-secondary-container font-black px-4 py-2.5 text-xs transition active:scale-[0.97]">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {/* Mobile Accordions */}
            <div className="space-y-3 md:hidden">
              <details className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Trip Categories
                </summary>
                <div className="mt-3 grid gap-2.5 text-sm text-surface/90">
                  {tripStyles.map((item) => (
                    <button
                      key={item}
                      className="text-left transition-all hover:translate-x-1 hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </details>

              <details className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Quick Links
                </summary>
                <div className="mt-3 grid gap-2.5 text-sm text-surface/90">
                  {footerLinks.map((link) => (
                    <button
                      key={link}
                      className="text-left transition-all hover:translate-x-1 hover:text-secondary-container"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </details>

              <details className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Resources
                </summary>
                <div className="mt-3 grid gap-2.5 text-sm text-surface/85">
                  {resources.map((item) => (
                    <button
                      key={item}
                      className="text-left transition-all hover:translate-x-1 hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {/* Desktop Columns */}
            <div className="hidden gap-8 md:grid md:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Trip Categories
                </p>
                <div className="mt-5 space-y-3.5 text-sm text-surface/80">
                  {tripStyles.map((item) => (
                    <button
                      key={item}
                      className="block text-left transition-all duration-300 hover:translate-x-1.5 hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Quick Links
                </p>
                <div className="mt-5 space-y-3.5 text-sm text-surface/80">
                  {footerLinks.map((link) => (
                    <button
                      key={link}
                      className="block text-left transition-all duration-300 hover:translate-x-1.5 hover:text-secondary-container"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                  Resources
                </p>
                <div className="mt-5 space-y-3.5 text-sm text-surface/80">
                  {resources.map((item) => (
                    <button
                      key={item}
                      className="block text-left transition-all duration-300 hover:translate-x-1.5 hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact band (Internal to lg:col-span-8 to align nicely) */}
            <div className="mt-10 border-t border-white/10 pt-8">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary-container">
                Contact & Community
              </p>
              <div className="mt-4 flex flex-col gap-4 text-sm text-surface/80 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-bold text-white">help@bagpacker.in | +91 80000 12345</p>
                  <p className="text-xs text-surface/65">Monday - Saturday, 9:00 AM to 7:00 PM</p>
                </div>
                <div className="flex flex-wrap gap-4 text-surface/90">
                  {socialLinks.map((item) => (
                    <button 
                      key={item} 
                      className="rounded-lg bg-white/5 border border-white/5 hover:border-secondary-container/20 px-3 py-1.5 text-xs transition duration-300 hover:bg-white/10 hover:text-secondary-container"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-surface/60 md:mt-12 md:flex-row md:items-center md:justify-between">
          <p>© {year} BagPacker Expedition Tech. All rights reserved.</p>
          <p className="font-bold">Built for modern Indian explorers.</p>
        </div>
      </div>
    </footer>
  );
}
