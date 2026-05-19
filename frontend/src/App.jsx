import { Suspense, lazy, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuthModal } from "./context/AuthModalContext";
import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/dist/locomotive-scroll.css";
import AlertHost from "./components/ui/AlertHost";
import LoadingPanel from "./components/ui/LoadingPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import RoleRoute from "./components/RoleRoute";
import AuthModal from "./components/AuthModal";
import { AuthModalProvider } from "./context/AuthModalContext";
import { getDashboardPath, setAuthTokenGetter } from "./lib/auth";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const TripDetailPage = lazy(() => import("./pages/TripDetailPage"));
const TravelerDashboardPage = lazy(() => import("./pages/TravelerDashboardPage"));
const OrganizerDashboardPage = lazy(() => import("./pages/OrganizerDashboardPage"));
const OrganizerTripBuyersPage = lazy(() => import("./pages/OrganizerTripBuyersPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const CompanionPage = lazy(() => import("./pages/CompanionPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const CreateTripPage = lazy(() => import("./pages/CreateTripPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function DashboardRedirect() {
  const user = useSelector((state) => state.auth.user);
  return <Navigate to={getDashboardPath(user?.role)} replace />;
}

function AuthRedirect() {
  const [searchParams] = useSearchParams();
  const { openAuthModal } = useAuthModal();
  useEffect(() => {
    const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
    openAuthModal(mode);
  }, [searchParams, openAuthModal]);
  return <Navigate to="/" replace />;
}

function App() {
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const locomotiveRef = useRef(null);

  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => setAuthTokenGetter(null);
  }, [token]);

  useEffect(() => {
    const preloadNonCriticalRoutes = () => {
      void import("./pages/SearchPage");
      void import("./pages/TripDetailPage");
      void import("./pages/CompanionPage");
      void import("./pages/ChatPage");
      void import("./pages/TravelerDashboardPage");
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preloadNonCriticalRoutes, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preloadNonCriticalRoutes, 800);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isTouchDevice =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth < 1024;

    // Locomotive's transform-based smooth scrolling can feel laggy on touch/low-power devices.
    if (prefersReducedMotion || isTouchDevice) {
      return;
    }

    // Destroy any existing instance before creating a new one (React Strict Mode safe)
    if (locomotiveRef.current) {
      locomotiveRef.current.destroy();
      locomotiveRef.current = null;
    }

    locomotiveRef.current = new LocomotiveScroll({
      el: scrollContainerRef.current,
      smooth: true,
      lerp: 0.12,
      smartphone: { smooth: false },
      tablet: { smooth: false },
    });

    return () => {
      if (locomotiveRef.current) {
        locomotiveRef.current.destroy();
        locomotiveRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const scroller = locomotiveRef.current;
    if (!scroller) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    // Reset scroll position and rebuild scroll metrics for new page content
    scroller.scrollTo(0, { duration: 0, disableLerp: true });

    // Delay update to allow new page content to render before recalculating height
    const rafId = requestAnimationFrame(() => {
      if (typeof scroller.update === "function") {
        scroller.update();
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [location.pathname]);

  return (
    <AuthModalProvider>
    <div ref={scrollContainerRef} data-scroll-container>
      <ErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
            <LoadingPanel label="Loading page..." variant="page" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/trips">
            <Route index element={<Navigate to="search" replace />} />
            <Route path="search" element={<SearchPage />} />
            <Route
              path="create"
              element={
                <RoleRoute allowedRoles={["organizer"]}>
                  <CreateTripPage />
                </RoleRoute>
              }
            />
            <Route
              path=":id/edit"
              element={
                <RoleRoute allowedRoles={["organizer"]}>
                  <CreateTripPage />
                </RoleRoute>
              }
            />
            <Route path=":id" element={<TripDetailPage />} />
          </Route>
          <Route path="/dashboard">
            <Route index element={<DashboardRedirect />} />
            <Route
              path="traveler"
              element={
                <RoleRoute allowedRoles={["traveler"]}>
                  <TravelerDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="organizer"
              element={
                <RoleRoute allowedRoles={["organizer"]}>
                  <OrganizerDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="organizer/trips"
              element={
                <RoleRoute allowedRoles={["organizer"]}>
                  <OrganizerDashboardPage />
                </RoleRoute>
              }
            />
            <Route
              path="organizer/trips/:tripId"
              element={
                <RoleRoute allowedRoles={["organizer"]}>
                  <OrganizerTripBuyersPage />
                </RoleRoute>
              }
            />
          </Route>
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </RoleRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <RoleRoute allowedRoles={["traveler"]}>
                <PaymentPage />
              </RoleRoute>
            }
          />
          <Route
            path="/companion"
            element={
              <RoleRoute allowedRoles={["traveler"]}>
                <CompanionPage />
              </RoleRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <RoleRoute allowedRoles={["traveler", "organizer", "admin"]}>
                <ChatPage />
              </RoleRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleRoute allowedRoles={["traveler", "organizer", "admin"]}>
                <ProfilePage />
              </RoleRoute>
            }
          />
          <Route path="/users/:id" element={<PublicProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      <AuthModal />
      <AlertHost />
    </div>
    </AuthModalProvider>
  );
}

export default App;
