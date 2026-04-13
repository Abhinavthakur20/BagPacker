import { NavLink, useNavigate } from "react-router-dom";
import { BsSuitcase } from "react-icons/bs";
import { navLinks } from "../data/mockData";
import {
  clearAuth,
  getDashboardPath,
  getStoredUser,
  isAuthenticated,
} from "../lib/auth";
import { showConfirmAlert, showSuccessAlert } from "../lib/alerts";

const getLinkClass = ({ isActive }) =>
  [
    "text-sm font-headline font-semibold tracking-tight transition-colors",
    isActive
      ? "text-secondary border-b-2 border-secondary-container pb-1"
      : "text-primary hover:text-secondary",
  ].join(" ");

export default function TopNav() {
  const navigate = useNavigate();
  const isLoggedIn = isAuthenticated();
  const user = getStoredUser();
  const dashboardPath = getDashboardPath(user?.role);
  const resolvedNavLinks = isLoggedIn
    ? navLinks.map((item) =>
        item.to === "/dashboard/traveler"
          ? {
              ...item,
              label: user?.role === "admin" ? "Admin Panel" : "Dashboard",
              to: dashboardPath,
            }
          : item,
      )
    : navLinks;

  const logout = async () => {
    const result = await showConfirmAlert({
      title: "Logout from BagPacker?",
      text: "You can log back in anytime from the auth page.",
      confirmButtonText: "Logout",
    });

    if (!result.isConfirmed) {
      return;
    }

    clearAuth();
    await showSuccessAlert("Logged out", "Your session has been cleared.");
    navigate("/");
  };

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
              to={dashboardPath}
              className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-container-low"
            >
              {user?.role === "admin" ? "Admin" : "Dashboard"}
            </NavLink>
            <NavLink
              to="/profile"
              className="material-symbols-outlined rounded-full p-2 hover:bg-surface-container-low"
            >
              account_circle
            </NavLink>
            <button
              onClick={logout}
              className="material-symbols-outlined rounded-full p-2 hover:bg-surface-container-low"
              aria-label="Logout"
            >
              logout
            </button>
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
