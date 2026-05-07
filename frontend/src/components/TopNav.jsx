import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { BsSuitcase } from "react-icons/bs";

const getDesktopLinkClass = ({ isActive }) =>
  [
    "nav-link relative inline-flex items-center px-4 py-2 text-sm font-headline font-bold tracking-tight transition-all duration-300 rounded-xl",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-on-surface-variant/80 hover:bg-surface-container-high hover:text-on-surface",
  ].join(" ");

export default function TopNav() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const role = user?.role;
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const resolvedNavLinks = (() => {
    if (!isLoggedIn) {
      return [
        { label: "Home", to: "/" },
        { label: "Expeditions", to: "/trips/search" },
      ];
    }

    if (role === "admin") {
      return [
        { label: "Home", to: "/" },
        { label: "Admin Hub", to: "/admin" },
      ];
    }

    if (role === "organizer") {
      return [
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard/organizer" },
        { label: "Launch Trip", to: "/trips/new" },
        { label: "Inbox", to: "/chat" },
      ];
    }

    return [
      { label: "Home", to: "/" },
      { label: "Explore", to: "/trips/search" },
      { label: "Companion", to: "/companion" },
      { label: "Bookings", to: "/dashboard/traveler" },
      { label: "Messages", to: "/chat" },
    ];
  })();

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-outline-variant/10 bg-surface/80 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 md:px-10">
        {/* ── Logo ── */}
        <NavLink to="/" className="group inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105">
            <BsSuitcase
              className="text-xl text-primary"
              aria-hidden="true"
            />
          </div>
          <span className="font-headline text-xl font-black tracking-tight text-on-surface">
            Bag<span className="text-secondary">Packer</span>
          </span>
        </NavLink>

        {/* ── Desktop nav links ── */}
        <div className="hidden items-center gap-2 md:flex">
          {resolvedNavLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={getDesktopLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* ── Desktop right section ── */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <NavLink
              to="/profile"
              aria-label="Open profile"
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-low transition-all duration-300 hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[1.4rem] text-on-surface-variant transition-colors group-hover:text-primary">
                account_circle
              </span>
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/auth?mode=login"
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-on-surface active:scale-[0.97]"
              >
                Login
              </NavLink>
              <NavLink
                to="/auth?mode=signup"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-black uppercase tracking-widest text-on-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97]"
              >
                Join
              </NavLink>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          aria-label={
            isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-on-surface md:hidden"
        >
          <span className="material-symbols-outlined text-[1.35rem]">
            {isMobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out md:hidden ${
          isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-outline-variant/10 bg-surface px-6 pb-10 pt-4">
          <div className="grid gap-2">
            {resolvedNavLinks.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-5 py-4 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/10"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-6 border-t border-outline-variant/10 pt-6">
            {isLoggedIn ? (
              <NavLink
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-surface-container-high px-5 text-sm font-bold text-on-surface shadow-sm"
              >
                <span className="material-symbols-outlined text-[1.2rem]">
                  account_circle
                </span>
                View Profile
              </NavLink>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NavLink
                  to="/auth?mode=login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-outline-variant/20 px-4 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/auth?mode=signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-on-primary"
                >
                  Join
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
