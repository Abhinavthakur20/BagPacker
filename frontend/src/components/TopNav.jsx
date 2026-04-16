import { NavLink } from "react-router-dom";
import { BsSuitcase } from "react-icons/bs";
import {
  getStoredUser,
  isAuthenticated,
} from "../lib/auth";

const getLinkClass = ({ isActive }) =>
  [
    "text-sm font-headline font-semibold tracking-tight transition-colors",
    isActive
      ? "text-secondary border-b-2 border-secondary-container pb-1"
      : "text-primary hover:text-secondary",
  ].join(" ");

export default function TopNav() {
  const isLoggedIn = isAuthenticated();
  const user = getStoredUser();
  const role = user?.role;
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
        {isLoggedIn ? (
          <div className="flex items-center gap-3 text-primary">
            <NavLink
              to="/profile"
              className="material-symbols-outlined rounded-full p-2 hover:bg-surface-container-low"
            >
              account_circle
            </NavLink>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink
              to="/auth?mode=login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low"
            >
              Login
            </NavLink>
            <NavLink
              to="/auth?mode=signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-container"
            >
              Sign Up
            </NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}
