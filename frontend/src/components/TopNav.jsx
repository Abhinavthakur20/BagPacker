import { useState } from "react";
import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { BsSuitcase } from "react-icons/bs";

const getLinkClass = ({ isActive }) =>
  [
    "text-sm font-headline font-semibold tracking-tight transition-colors",
    isActive
      ? "text-secondary border-b-2 border-secondary-container pb-1"
      : "text-primary hover:text-secondary",
  ].join(" ");

export default function TopNav() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const role = user?.role;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        { label: "Organizer Dashboard", to: "/dashboard/organizer" },
        { label: "Create Trip", to: "/trips/new" },
        { label: "Chat", to: "/chat" },
      ];
    }

    return [
      { label: "Home", to: "/" },
      { label: "Search Trips", to: "/trips/search" },
      { label: "Find Companion", to: "/companion" },
      { label: "My Bookings", to: "/dashboard/traveler" },
      { label: "Chat", to: "/chat" },
    ];
  })();

  return (
    <nav className="glass-nav fixed top-0 z-40 w-full border-b border-outline-variant/30 bg-gray-300/95 shadow-[0_12px_32px_rgba(28,28,24,0.06)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <NavLink
          to="/"
          className="inline-flex items-center gap-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface"
        >
          <BsSuitcase className="text-[1.8rem]" aria-hidden="true" />
          BagPacker
        </NavLink>

        <div className="hidden items-center gap-8 md:flex">
          {resolvedNavLinks.map((item) => (
            <NavLink key={item.to} to={item.to} className={getLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            <NavLink
              to="/profile"
              aria-label="Open profile"
              className="material-symbols-outlined rounded-full p-2 text-primary transition hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              account_circle
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/auth?mode=login"
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
              >
                Login
              </NavLink>
              <NavLink
                to="/auth?mode=signup"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary transition hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
        >
          <span className="material-symbols-outlined text-[1.45rem]">
            {isMobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      <div
        className={`border-t border-outline-variant/30 bg-surface-container-lowest px-4 pb-4 pt-3 shadow-[0_12px_30px_rgba(28,28,24,0.08)] transition md:hidden ${
          isMobileMenuOpen ? "block" : "hidden"
        }`}
      >
        <div className="grid gap-1">
          {resolvedNavLinks.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface hover:bg-surface-container-low"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-3 border-t border-outline-variant/25 pt-3">
          {isLoggedIn ? (
            <NavLink
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Profile
            </NavLink>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <NavLink
                to="/auth?mode=login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm font-semibold text-primary"
              >
                Login
              </NavLink>
              <NavLink
                to="/auth?mode=signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
              >
                Sign Up
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
