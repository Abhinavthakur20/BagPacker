import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useLocation } from "react-router-dom";
import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/dist/locomotive-scroll.css";
import LandingPage from "./pages/LandingPage";
import SearchPage from "./pages/SearchPage";
import TripDetailPage from "./pages/TripDetailPage";
import AuthPage from "./pages/AuthPage";
import TravelerDashboardPage from "./pages/TravelerDashboardPage";
import OrganizerDashboardPage from "./pages/OrganizerDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PaymentPage from "./pages/PaymentPage";
import CompanionPage from "./pages/CompanionPage";
import ChatPage from "./pages/ChatPage";
import CreateTripPage from "./pages/CreateTripPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const locomotiveRef = useRef(null);

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

    scroller.scrollTo(0, { duration: 0, disableLerp: true });
    if (typeof scroller.update === "function") {
      scroller.update();
    }
  }, [location.pathname]);

  return (
    <div ref={scrollContainerRef} data-scroll-container>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/trips">
          <Route index element={<Navigate to="search" replace />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="new" element={<CreateTripPage />} />
          <Route path=":id" element={<TripDetailPage />} />
        </Route>
        <Route path="/dashboard">
          <Route index element={<Navigate to="traveler" replace />} />
          <Route path="traveler" element={<TravelerDashboardPage />} />
          <Route path="organizer" element={<OrganizerDashboardPage />} />
        </Route>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/companion" element={<CompanionPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
