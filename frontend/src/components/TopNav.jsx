import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { BsSuitcase } from "react-icons/bs";

const getDesktopLinkClass = ({ isActive }) =>
  [
    "nav-link relative inline-flex items-center px-3 py-2 text-sm font-headline font-semibold tracking-tight text-white transition-all duration-300",
    isActive
      ? "nav-link-active text-white"
      : "text-white/90 hover:text-white",
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
        { label: "Search Trips", to: "/trips/search" },
      ];
    }

    if (role === "admin") {
      return [
        { label: "Home", to: "/" },
        { label: "Admin Panel", to: "/admin" },
      ];
    }

    if (role === "organizer") {
      return [
        { label: "Home", to: "/" },
        { label: "Dashboard", to: "/dashboard/organizer" },
        { label: "Create Trip", to: "/trips/new" },
        { label: "Chat", to: "/chat" },
      ];
    }

    return [
      { label: "Home", to: "/" },
      { label: "Search Trips", to: "/trips/search" },
      { label: "Companion", to: "/companion" },
      { label: "My Bookings", to: "/dashboard/traveler" },
      { label: "Chat", to: "/chat" },
    ];
  })();

  return (
    <nav className="fixed top-0 z-[100] w-full border-b border-white/15 bg-[#1f2430] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        {/* ── Logo ── */}
        <NavLink to="/" className="group inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container/20 transition-all duration-300 group-hover:bg-secondary-container/30 group-hover:scale-105">
            <BsSuitcase
              className="text-lg text-secondary-container"
              aria-hidden="true"
            />
          </span>
          <span className="font-headline text-lg font-extrabold tracking-tight text-white">
            Bag <span className="text-secondary-container">Packer</span>
          </span>
        </NavLink>

        {/* ── Desktop nav links ── */}
        <div className="hidden items-center gap-6 md:flex">
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
        <div className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            <NavLink
              to="/profile"
              aria-label="Open profile"
              className="group flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 transition-all duration-300 hover:bg-white/20"
            >
              <span className="material-symbols-outlined text-[1.5rem] text-white/80 transition-colors group-hover:text-secondary-container">
                account_circle
              </span>
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/auth?mode=login"
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition-all duration-300 hover:border-white/50 hover:bg-white/20 hover:text-white active:scale-[0.97]"
              >
                Login
              </NavLink>
              <NavLink
                to="/auth?mode=signup"
                className="rounded-lg bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container shadow-[0_2px_12px_rgba(127,161,28,0.3)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(127,161,28,0.45)] hover:brightness-110 active:scale-[0.97]"
              >
                Sign Up
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white/80 transition-all duration-300 hover:bg-white/20 hover:text-white md:hidden"
        >
          <span className="material-symbols-outlined text-[1.35rem]">
            {isMobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-white/15 bg-[#252b38] px-4 pb-5 pt-3">
          <div className="grid gap-1">
            {resolvedNavLinks.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            {isLoggedIn ? (
              <NavLink
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary-container px-4 py-2.5 text-sm font-bold text-on-secondary-container shadow-[0_2px_12px_rgba(127,161,28,0.25)] transition-all duration-300 hover:brightness-110"
              >
                <span className="material-symbols-outlined text-[1.1rem]">
                  account_circle
                </span>
                Profile
              </NavLink>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NavLink
                  to="/auth?mode=login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/90 transition-all duration-200 hover:bg-white/10"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/auth?mode=signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary-container px-3 py-2 text-sm font-bold text-on-secondary-container shadow-[0_2px_12px_rgba(127,161,28,0.25)]"
                >
                  Sign Up
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
