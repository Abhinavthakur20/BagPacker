import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const badgeStylesByStatus = {
  active: "bg-[#858585] text-[#f94a4a]",
  completed: "bg-[#e2e8fb] text-[#858585]",
  cancelled: "bg-error-container text-error",
};

const PAYMENT_STATUS_LABELS = {
  created: "Pending",
  paid: "Paid",
  failed: "Failed",
  refund_required: "Refund Required",
  refunded: "Refunded",
};

const defaultTripQuery = {
  page: 1,
  limit: 10,
  q: "",
  status: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function OrganizerDashboardPage() {
  const location = useLocation();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);

  const [organizer, setOrganizer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [tripPagination, setTripPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [tripQuery, setTripQuery] = useState(defaultTripQuery);
  const [tripSearchInput, setTripSearchInput] = useState("");
  const [posts, setPosts] = useState([]);
  const [finance, setFinance] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedComposerPreviewIndex, setSelectedComposerPreviewIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isTripsLoading, setIsTripsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [markingReadId, setMarkingReadId] = useState("");
  const [actingTripId, setActingTripId] = useState("");
  const [error, setError] = useState("");

  // ADVANCED ADDITIONS
  // Global Travelers Registry
  const [globalBookings, setGlobalBookings] = useState([]);
  const [isTravelersLoading, setIsTravelersLoading] = useState(false);
  const [globalTravelersSearch, setGlobalTravelersSearch] = useState("");

  // Interactive Seat Visual Layout
  const [selectedSeatTripId, setSelectedSeatTripId] = useState("");
  const [seatMapBookings, setSeatMapBookings] = useState([]);
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(false);
  const [selectedSeatTraveler, setSelectedSeatTraveler] = useState(null);

  // Projected Earnings Simulator
  const [simulatedOccupancy, setSimulatedOccupancy] = useState(75);

  // AI Operations Copilot
  const [aiIntent, setAiIntent] = useState("qa");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChat, setAiChat] = useState([
    {
      role: "assistant",
      content: "Hello! I am your Organizer AI Copilot. Select a quick action below or type a request to audit itineraries, generate checklists, or draft traveler communications.",
    },
  ]);
  const [aiIsLoading, setAiIsLoading] = useState(false);

  // Settlements
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([
    { id: "P-8802", date: "2026-05-12", amount: 48500, status: "Completed", bank: "HDFC Bank (**** 9876)" },
    { id: "P-8803", date: "2026-05-16", amount: 35000, status: "Completed", bank: "HDFC Bank (**** 9876)" },
  ]);
  const [updatingPaymentTripId, setUpdatingPaymentTripId] = useState("");

  const approvalTone =
    organizer?.approvalStatus === "approved"
      ? "bg-[#858585] text-[#f94a4a]"
      : organizer?.approvalStatus === "rejected"
        ? "bg-error-container text-error"
        : "bg-[#3d4466] text-[#f94a4a]";
  const canCreateTrips = organizer?.approvalStatus === "approved";
  const previewProfileUrl = organizer?.userId?._id ? `/users/${organizer.userId._id}` : "/trips/search";

  const loadPrimaryData = useCallback(async () => {
    const [organizerProfile, organizerPosts, financeSnapshot, notificationSnapshot] = await Promise.all([
      api.get("/organizers/me"),
      api.get("/organizers/me/posts"),
      api.get("/organizers/me/finance"),
      api.get("/notifications?limit=6"),
    ]);
    setOrganizer(organizerProfile);
    setPosts(Array.isArray(organizerPosts) ? organizerPosts : []);
    setFinance(financeSnapshot || null);
    setNotifications(Array.isArray(notificationSnapshot?.items) ? notificationSnapshot.items : []);
  }, []);

  const loadTrips = useCallback(async (queryOverrides = defaultTripQuery) => {
    const query = { ...defaultTripQuery, ...queryOverrides };
    const params = new URLSearchParams();
    params.set("page", String(query.page));
    params.set("limit", String(query.limit));
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    params.set("sortBy", query.sortBy);
    params.set("sortOrder", query.sortOrder);

    setIsTripsLoading(true);
    try {
      const response = await api.get(`/organizers/me/trips?${params.toString()}`);
      setTrips(Array.isArray(response?.items) ? response.items : []);
      setTripPagination({
        page: safeNumber(response?.pagination?.page, query.page),
        limit: safeNumber(response?.pagination?.limit, query.limit),
        total: safeNumber(response?.pagination?.total),
        totalPages: Math.max(1, safeNumber(response?.pagination?.totalPages, 1)),
      });
    } finally {
      setIsTripsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (tripFilters = defaultTripQuery) => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    setError("");
    try {
      await Promise.all([loadPrimaryData(), loadTrips(tripFilters)]);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, loadPrimaryData, loadTrips]);

  useEffect(() => {
    loadDashboard(defaultTripQuery);
  }, [isLoggedIn, loadDashboard]);

  useEffect(() => {
    if (location.pathname === "/dashboard/organizer/trips") {
      setActiveView("trips");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadTrips(tripQuery).catch((fetchError) => setError(fetchError.message));
  }, [tripQuery, isLoggedIn, loadTrips]);

  // Load global travelers registry
  const loadAllTravelers = useCallback(async () => {
    if (!trips.length) return;
    setIsTravelersLoading(true);
    try {
      const allBookings = [];
      await Promise.all(
        trips.map(async (t) => {
          try {
            const res = await api.get(`/organizers/me/trips/${t._id}/bookings`);
            if (res && Array.isArray(res.bookings)) {
              res.bookings.forEach((b) => {
                allBookings.push({ ...b, tripTitle: t.title, tripId: t._id });
              });
            }
          } catch {
            // Ignore single trip fetch errors
          }
        })
      );
      setGlobalBookings(allBookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTravelersLoading(false);
    }
  }, [trips]);

  useEffect(() => {
    if (activeView === "travelers") {
      loadAllTravelers();
    }
  }, [activeView, loadAllTravelers]);

  // Load interactive seat map
  const fetchSeatMapForTrip = useCallback(async (tripId) => {
    if (!tripId) {
      setSeatMapBookings([]);
      setSelectedSeatTraveler(null);
      return;
    }
    setIsSeatMapLoading(true);
    setSelectedSeatTraveler(null);
    try {
      const res = await api.get(`/organizers/me/trips/${tripId}/bookings`);
      setSeatMapBookings(Array.isArray(res?.bookings) ? res.bookings : []);
    } catch (err) {
      await showErrorAlert("Failed to load layout", err.message);
    } finally {
      setIsSeatMapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSeatTripId) {
      fetchSeatMapForTrip(selectedSeatTripId);
    }
  }, [selectedSeatTripId, fetchSeatMapForTrip]);

  // Toggle online payments inline
  const toggleTripPayment = async (tripId, currentStatus) => {
    try {
      setUpdatingPaymentTripId(tripId);
      await api.put(`/trips/${tripId}`, { paymentEnabled: !currentStatus });
      await showSuccessAlert("Success", `Online payments are now ${!currentStatus ? "enabled" : "disabled"} for this trip.`);
      await loadTrips(tripQuery);
    } catch (err) {
      await showErrorAlert("Error", err.message);
    } finally {
      setUpdatingPaymentTripId("");
    }
  };

  // AI Assistant QA Chat
  const handleAskAICopilot = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    const userMsg = aiQuestion.trim();
    setAiQuestion("");
    setAiChat((prev) => [...prev, { role: "user", content: userMsg }]);
    setAiIsLoading(true);
    try {
      const response = await api.post("/ai/copilot", {
        intent: aiIntent,
        message: userMsg,
        context: {
          businessName: organizer?.businessName,
          totalTrips: trips.length,
          revenue: finance?.totals?.grossPaid,
        },
      });
      setAiChat((prev) => [
        ...prev,
        { role: "assistant", content: response.answer || "I'm sorry, I couldn't process that request." },
      ]);
    } catch (err) {
      setAiChat((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setAiIsLoading(false);
    }
  };

  // Simulated Payout Request
  const requestPayout = async () => {
    const settlementAmt = safeNumber(finance?.totals?.settlementEstimate);
    if (settlementAmt <= 0) return;
    setIsRequestingPayout(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const newPayout = {
        id: `P-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split("T")[0],
        amount: settlementAmt,
        status: "Completed",
        bank: `${organizer?.bankAccountDetails ? organizer.bankAccountDetails.substring(0, 12) : "HDFC Bank"} (**** 9876)`,
      };
      setPayoutHistory((prev) => [newPayout, ...prev]);
      // Mock local update of finance
      setFinance((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totals: {
            ...prev.totals,
            settlementEstimate: 0,
            refunded: prev.totals.refunded + settlementAmt, // mock moving to finalized
          },
        };
      });
      setPayoutModalOpen(false);
      await showSuccessAlert("Payout Sent", `₹${settlementAmt.toLocaleString("en-IN")} has been dispatched to your verified bank account.`);
    } catch (err) {
      await showErrorAlert("Payout Failed", err.message);
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const refreshFinanceAndTrips = async () => {
    await Promise.all([loadTrips(tripQuery), loadPrimaryData()]);
  };

  const startTrip = async (tripId) => {
    try {
      setActingTripId(tripId);
      setError("");
      await api.put(`/trips/${tripId}/start`, {});
      await showSuccessAlert("Trip started", "Trip is now marked as in progress.");
      await refreshFinanceAndTrips();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not start trip", requestError.message);
    } finally {
      setActingTripId("");
    }
  };

  const updateTripLifecycle = async ({ tripId, status, title, message }) => {
    const confirmResult = await showConfirmAlert({
      title,
      text: message,
      confirmButtonText: "Confirm",
      icon: "warning",
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setActingTripId(tripId);
      setError("");
      await api.put(`/trips/${tripId}`, { status });
      await showSuccessAlert("Trip updated", `Trip status is now ${status}.`);
      await refreshFinanceAndTrips();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not update trip", requestError.message);
    } finally {
      setActingTripId("");
    }
  };

  const deleteTrip = async (tripId) => {
    const confirmResult = await showConfirmAlert({
      title: "Delete this trip?",
      text: "This action cannot be undone. Bookings without confirmation will be deleted.",
      confirmButtonText: "Delete",
      tone: "error",
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setActingTripId(tripId);
      setError("");
      await api.del(`/trips/${tripId}`);
      await showSuccessAlert("Trip deleted", "Trip and related draft records are removed.");
      await refreshFinanceAndTrips();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Could not delete trip", requestError.message);
    } finally {
      setActingTripId("");
    }
  };

  const submitPost = async () => {
    if (!mediaFiles.length) {
      setError("Please select at least one photo or video.");
      return;
    }
    try {
      setIsPosting(true);
      setError("");
      const formData = new FormData();
      formData.append("caption", caption);
      mediaFiles.forEach((file) => formData.append("media", file));
      await api.post("/organizers/me/posts", formData);
      const organizerPosts = await api.get("/organizers/me/posts");
      setPosts(Array.isArray(organizerPosts) ? organizerPosts : []);
      setCaption("");
      setMediaFiles([]);
      setSelectedComposerPreviewIndex(0);
    } catch (postError) {
      setError(postError.message);
    } finally {
      setIsPosting(false);
    }
  };

  const removePost = async (postId) => {
    try {
      setDeletingPostId(postId);
      setError("");
      await api.del(`/organizers/me/posts/${postId}`);
      setPosts((prev) => prev.filter((item) => item._id !== postId));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingPostId("");
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      setMarkingReadId(notificationId);
      await api.put(`/notifications/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((item) => (item._id === notificationId ? { ...item, isRead: true } : item)),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMarkingReadId("");
    }
  };

  const dashboard = useMemo(() => {
    const totalTrips = safeNumber(tripPagination.total);
    const activeTrips = trips.filter((trip) => trip.status === "active").length;
    const seatsFilled = trips.reduce(
      (sum, trip) => sum + Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats)),
      0,
    );
    const totalSeats = trips.reduce((sum, trip) => sum + safeNumber(trip.totalSeats), 0);
    const fillPercent = totalSeats ? Math.min(100, Math.round((seatsFilled / totalSeats) * 100)) : 0;
    const revenueEstimate = safeNumber(finance?.totals?.grossPaid);
    const cards = [
      { label: "Total Trips", value: totalTrips, icon: "map", tone: "neutral" },
      { label: "Active Trips", value: activeTrips, icon: "pace", tone: "neutral" },
      {
        label: "Seats Filled",
        value: `${seatsFilled}/${totalSeats || 0}`,
        helper: `${fillPercent}% occupancy`,
        icon: "group",
        tone: "neutral",
      },
      {
        label: "Gross Paid",
        value: formatINR(revenueEstimate),
        helper: "Organizer finance snapshot",
        icon: "payments",
        tone: "primary",
      },
    ];

    return { cards, fillPercent, seatsFilled, totalSeats, revenueEstimate };
  }, [finance, tripPagination.total, trips]);

  const composerPreviews = useMemo(
    () =>
      mediaFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      })),
    [mediaFiles],
  );

  useEffect(
    () => () => {
      composerPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [composerPreviews],
  );

  if (!isLoggedIn) {
    return (
      <MainLayout hideFooterOnMobile={true}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access your organizer dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  const selectedComposerPreview = composerPreviews[selectedComposerPreviewIndex] || null;
  const searchSortValue = `${tripQuery.sortBy}:${tripQuery.sortOrder}`;

  return (
    <MainLayout hideFooterOnMobile={true}>
      <div className="flex min-h-[calc(100vh-64px)] bg-[#f8fafc]">
        <aside className="hidden w-64 flex-col border-r border-[#e2e8f0] bg-white md:flex">
          <div className="p-6 border-b border-[#e2e8f0]/60">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-xl font-medium">business_center</span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-on-surface">
                  Organizer Console
                </h2>
                <p className="text-[10px] font-medium text-on-surface-variant/50">BagPacker Business</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 pt-6">
            {[
              ["overview", "Overview", "space_dashboard"],
              ["trips", "My Posted Trips", "inventory_2"],
              ["travelers", "Traveler Registry", "group"],
              ["analytics", "Visual Analytics", "analytics"],
              ["ai_copilot", "AI Copilot Helper", "smart_toy"],
              ["social", "Social Profile", "photo_library"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  activeView === key
                    ? "bg-primary/5 text-primary border-l-4 border-primary"
                    : "text-on-surface-variant/80 hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[1.15rem]">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="mx-4 mb-6 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-sm">
                {organizer?.businessName?.charAt(0) || user?.name?.charAt(0) || "O"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-on-surface">{organizer?.businessName || user?.name || "Organizer"}</p>
                <div className={`mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${approvalTone}`}>
                  {organizer?.approvalStatus || "pending"}
                </div>
              </div>
            </div>
            <div className="mt-3.5 space-y-1.5 border-t border-[#e2e8f0] pt-3 text-[10px] font-medium text-on-surface-variant/70">
              <p className="truncate">GST: {organizer?.gstNumber || "N/A"}</p>
              <p className="truncate">Email: {user?.email || "N/A"}</p>
            </div>
          </div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface/80 backdrop-blur-xl md:hidden">
          <nav className="flex items-center justify-around px-2 py-3 overflow-x-auto gap-2">
            {[
              ["overview", "space_dashboard", "Home"],
              ["trips", "inventory_2", "Trips"],
              ["travelers", "group", "Travelers"],
              ["analytics", "analytics", "Charts"],
              ["ai_copilot", "smart_toy", "AI"],
              ["social", "photo_library", "Social"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`relative flex flex-col items-center gap-1 transition-all min-w-[50px] ${
                  activeView === key ? "text-primary" : "text-on-surface-variant/40"
                }`}
              >
                <span className={`material-symbols-outlined text-[1.4rem] ${activeView === key ? "font-bold" : ""}`}>
                  {icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-10 pb-24 md:px-12 md:pb-10">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-on-surface capitalize">
                  {activeView.replace("_", " ")}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {canCreateTrips ? (
                  <Link
                    to="/trips/create"
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm transition hover:bg-primary/95"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Create Trip
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={true}
                    className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface-variant/70"
                    title="Create Trip is enabled only for approved organizers"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Create Trip
                  </button>
                )}
                <button
                  onClick={() => loadDashboard(tripQuery)}
                  className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-on-surface-variant transition hover:bg-surface-container-low"
                  title="Refresh Dashboard"
                >
                  <span className="material-symbols-outlined text-[1.1rem]">refresh</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error-container p-4 text-sm font-bold text-error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-outline-variant/20 bg-surface">
                <LoadingPanel label="Accessing Organizer Terminal..." variant="grid" />
              </div>
            ) : (
              <div className="space-y-10">
                {activeView === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {dashboard.cards.map((card) => (
                        <article
                          key={card.label}
                          className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">
                                {card.label}
                              </p>
                              <p className="mt-1.5 text-xl font-bold text-on-surface">
                                {card.value}
                              </p>
                              {card.helper ? (
                                <p className="mt-1 text-[9px] font-medium text-secondary">
                                  {card.helper}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-on-surface-variant/40 pt-1">
                              <span className="material-symbols-outlined text-[1.4rem]">{card.icon}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-on-surface">
                          Financial Settlements
                        </h3>
                        <p className="text-[11px] font-medium text-on-surface-variant/50">
                          Overview of paid reserves and processing status
                        </p>

                        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.02] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/70">Available Settlement Balance</p>
                            <p className="mt-1 text-2xl font-bold text-primary">{formatINR(safeNumber(finance?.totals?.settlementEstimate))}</p>
                          </div>
                          {safeNumber(finance?.totals?.settlementEstimate) > 0 && (
                            <button
                              type="button"
                              onClick={() => setPayoutModalOpen(true)}
                              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition shadow-sm"
                            >
                              Request Transfer
                            </button>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/50">Gross Paid</p>
                            <p className="mt-1 text-base font-bold text-on-surface">{formatINR(safeNumber(finance?.totals?.grossPaid))}</p>
                          </div>
                          <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/50">Pending Escrow</p>
                            <p className="mt-1 text-base font-bold text-on-surface">{formatINR(safeNumber(finance?.totals?.pendingPayment))}</p>
                          </div>
                          <div className="rounded-lg border border-error/15 bg-error-container/20 p-4">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-error/70">Refund Required</p>
                            <p className="mt-1 text-base font-bold text-error">{formatINR(safeNumber(finance?.totals?.refundRequired))}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {Object.entries(finance?.counts?.paymentStatus || {}).map(([status, count]) => (
                            <span key={status} className="rounded-md bg-surface-container-low border border-[#e2e8f0] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                              {PAYMENT_STATUS_LABELS[status] || status}: {safeNumber(count)}
                            </span>
                          ))}
                        </div>

                        {/* Payout History List */}
                        <div className="mt-6 border-t border-[#e2e8f0] pt-5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-3">
                            Payout Dispatch Log
                          </h4>
                          <div className="space-y-2">
                            {payoutHistory.map((payout) => (
                              <div
                                key={payout.id}
                                className="flex items-center justify-between rounded-lg bg-[#f8fafc] p-3.5 text-xs border border-[#e2e8f0]"
                              >
                                <div>
                                  <p className="font-semibold text-on-surface">Ref ID: {payout.id}</p>
                                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                                    {payout.date} • {payout.bank}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-on-surface">{formatINR(payout.amount)}</p>
                                  <span className="inline-flex rounded-md bg-[#e2efe9] px-2 py-0.5 text-[8px] font-semibold text-primary mt-1">
                                    {payout.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                          <h3 className="text-base font-bold text-on-surface">
                            System Alerts
                          </h3>
                          <div className="mt-4 space-y-2">
                            {notifications.length ? (
                              notifications.map((item) => (
                                <article key={item._id} className={`rounded-lg border px-3.5 py-3 text-xs ${item.isRead ? "border-[#e2e8f0] bg-white text-on-surface-variant/80" : "border-primary/20 bg-primary/[0.01] text-on-surface"}`}>
                                  <p className="font-medium">{item.message}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-on-surface-variant/50">
                                      {formatDateLabel(item.createdAt)}
                                    </span>
                                    {!item.isRead ? (
                                      <button
                                        onClick={() => markNotificationRead(item._id)}
                                        disabled={markingReadId === item._id}
                                        className="rounded bg-primary px-2.5 py-1 text-[9px] font-semibold text-on-primary disabled:opacity-60"
                                      >
                                        {markingReadId === item._id ? "..." : "Dismiss"}
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-semibold text-on-surface-variant/40">Read</span>
                                    )}
                                  </div>
                                </article>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-[#e2e8f0] p-6 text-center text-xs font-medium text-on-surface-variant/50">
                                No notifications yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-secondary/20 bg-secondary/[0.02] p-5 text-xs text-on-surface-variant/80">
                          <p className="font-bold text-secondary mb-1">
                            Marketplace Compliance Status
                          </p>
                          <p className="leading-relaxed text-[11px] font-medium">
                            {canCreateTrips
                              ? "Your profile is verified. You can publish, start, cancel, close, and manage payouts."
                              : "Your profile is under audit. Trip creation is locked until approval."}
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {activeView === "trips" && (
                  <section className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-[#e2e8f0]/60 px-6 py-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            Trip Inventory
                          </h3>
                          <p className="text-[11px] font-medium text-on-surface-variant/50">
                            Search, lifecycle states, and operational controls
                          </p>
                        </div>
                        {canCreateTrips ? (
                          <Link to="/trips/create" className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition">
                            <span className="material-symbols-outlined text-sm">add</span>
                            New Trip
                          </Link>
                        ) : (
                          <button type="button" disabled={true} className="cursor-not-allowed rounded-lg bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface-variant/60">
                            Verification Pending
                          </button>
                        )}
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1.2fr_1fr_auto]">
                        <input
                          value={tripSearchInput}
                          onChange={(e) => setTripSearchInput(e.target.value)}
                          placeholder="Search departures, source or destination..."
                          className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary/30 focus:bg-white transition"
                        />
                        <select
                          value={tripQuery.status}
                          onChange={(e) => setTripQuery((prev) => ({ ...prev, page: 1, status: e.target.value }))}
                          className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <select
                          value={searchSortValue}
                          onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split(":");
                            setTripQuery((prev) => ({ ...prev, page: 1, sortBy, sortOrder }));
                          }}
                          className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none"
                        >
                          <option value="createdAt:desc">Newest Listings</option>
                          <option value="createdAt:asc">Oldest Listings</option>
                          <option value="startDate:asc">Departure Date</option>
                          <option value="pricePerPerson:desc">Highest Price</option>
                          <option value="pricePerPerson:asc">Lowest Price</option>
                        </select>
                        <select
                          value={String(tripQuery.limit)}
                          onChange={(e) => setTripQuery((prev) => ({ ...prev, page: 1, limit: Number(e.target.value) }))}
                          className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none"
                        >
                          <option value="10">10 per page</option>
                          <option value="20">20 per page</option>
                          <option value="50">50 per page</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setTripQuery((prev) => ({ ...prev, page: 1, q: tripSearchInput.trim() }))}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition"
                        >
                          Filter
                        </button>
                      </div>
                    </div>

                    {isTripsLoading ? (
                      <div className="px-6 py-10 sm:px-8">
                        <LoadingPanel label="Loading trips..." variant="list" />
                      </div>
                    ) : (
                      <div className="space-y-3 px-6 py-6">
                        {trips.length ? (
                          trips.map((trip) => {
                            const soldSeats = Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats));
                            const occupancy = trip.totalSeats ? Math.min(100, Math.round((soldSeats / trip.totalSeats) * 100)) : 0;
                            const isActing = actingTripId === trip._id;
                            return (
                              <article key={trip._id} className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm hover:border-[#bfdbfe]/60 transition-all duration-200">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="truncate text-base font-bold text-on-surface">{trip.title}</h4>
                                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeStylesByStatus[trip.status] || "bg-surface-container text-on-surface-variant"}`}>
                                        {trip.status}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-primary">
                                      {trip.source} <span className="mx-1">→</span> {trip.destination}
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium text-on-surface-variant/70">
                                      Departing: {formatDateLabel(trip.startDate)} • Price: {formatINR(trip.pricePerPerson)}
                                    </p>
                                    <div className="mt-3.5 flex items-center gap-2 border border-[#e2e8f0] bg-[#f8fafc] rounded-lg px-2.5 py-1 text-[10px] font-semibold w-fit">
                                      <span className="text-[9px] font-bold uppercase text-on-surface-variant/70">Online Bookings:</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleTripPayment(trip._id, trip.paymentEnabled)}
                                        disabled={updatingPaymentTripId === trip._id}
                                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                                          trip.paymentEnabled ? 'bg-primary' : 'bg-outline-variant/60'
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                            trip.paymentEnabled ? 'translate-x-3' : 'translate-x-0'
                                          }`}
                                        />
                                      </button>
                                      <span className="text-[10px] font-bold text-on-surface">
                                        {trip.paymentEnabled ? "Open" : "Closed"}
                                      </span>
                                      {updatingPaymentTripId === trip._id && <span className="text-[9px] text-secondary animate-pulse ml-1">updating...</span>}
                                    </div>
                                  </div>
                                  <div className="w-full lg:w-48">
                                    <div className="mb-1 flex items-center justify-between">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/50">Capacity</p>
                                      <p className="text-xs font-bold text-primary">{occupancy}%</p>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
                                      <div className="h-full rounded-full bg-primary" style={{ width: `${occupancy}%` }} />
                                    </div>
                                    <p className="mt-1 text-[10px] font-medium text-on-surface-variant/60">{soldSeats}/{trip.totalSeats} seats filled</p>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                                  {trip.status === "active" && !trip.startedAt ? (
                                    <button
                                      onClick={() => startTrip(trip._id)}
                                      disabled={isActing}
                                      className="rounded-lg bg-[#e2efe9] text-[#0f5132] px-3 py-2 text-[10px] font-bold uppercase tracking-wide hover:bg-[#d1e7dd] transition disabled:opacity-60"
                                    >
                                      {isActing ? "..." : "Start Trip"}
                                    </button>
                                  ) : null}
                                  {trip.status === "active" ? (
                                    <button
                                      onClick={() =>
                                        updateTripLifecycle({
                                          tripId: trip._id,
                                          status: "cancelled",
                                          title: "Cancel this trip?",
                                          message: "Confirmed paid bookings will move to refund-required queue.",
                                        })}
                                      disabled={isActing}
                                      className="rounded-lg bg-error-container/20 text-error px-3 py-2 text-[10px] font-bold uppercase tracking-wide hover:bg-error-container/40 transition disabled:opacity-60"
                                    >
                                      Cancel Trip
                                    </button>
                                  ) : null}
                                  {trip.status === "active" && trip.startedAt ? (
                                    <button
                                      onClick={() =>
                                        updateTripLifecycle({
                                          tripId: trip._id,
                                          status: "completed",
                                          title: "Close this trip?",
                                          message: "Trip status will move to completed.",
                                        })}
                                      disabled={isActing}
                                      className="rounded-lg bg-surface-container px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-highest transition disabled:opacity-60"
                                    >
                                      Close Trip
                                    </button>
                                  ) : null}
                                  {trip.status !== "active" ? (
                                    <button
                                      onClick={() => deleteTrip(trip._id)}
                                      disabled={isActing}
                                      className="rounded-lg bg-error text-on-error px-3 py-2 text-[10px] font-bold uppercase tracking-wide hover:bg-error/90 transition disabled:opacity-60"
                                    >
                                      Delete Trip
                                    </button>
                                  ) : null}
                                  <Link to={`/dashboard/organizer/trips/${trip._id}`} className="rounded-lg bg-primary px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-on-primary hover:bg-primary/95 transition">
                                    Buyers
                                  </Link>
                                  <Link to={`/chat?room=${encodeURIComponent(`trip_${trip._id}`)}`} className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-low transition">
                                    Chat
                                  </Link>
                                  <Link to={`/trips/update/${trip._id}`} className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-low transition">
                                    Edit
                                  </Link>
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low py-16 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                            No trips match current filters
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-white p-4">
                          <p className="text-xs font-semibold text-on-surface-variant/75">
                            Page {tripPagination.page} of {tripPagination.totalPages} ({tripPagination.total} trips total)
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setTripQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                              disabled={tripPagination.page <= 1}
                              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              onClick={() => setTripQuery((prev) => ({ ...prev, page: Math.min(tripPagination.totalPages, prev.page + 1) }))}
                              disabled={tripPagination.page >= tripPagination.totalPages}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/95 transition disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeView === "travelers" && (
                  <section className="space-y-6">
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            Traveler Registry
                          </h3>
                          <p className="text-[11px] font-medium text-on-surface-variant/50">
                            Unified directory of active trip reservation holders
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={globalTravelersSearch}
                            onChange={(e) => setGlobalTravelersSearch(e.target.value)}
                            placeholder="Search passengers or trips..."
                            className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary/30 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      {isTravelersLoading ? (
                        <div className="py-12">
                          <LoadingPanel label="Compiling traveler registries..." variant="list" />
                        </div>
                      ) : (
                        <div className="mt-6 overflow-hidden rounded-lg border border-[#e2e8f0]">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/75">
                                <tr>
                                  <th className="px-6 py-4">Traveler</th>
                                  <th className="px-6 py-4">Trip Details</th>
                                  <th className="px-6 py-4">Contact</th>
                                  <th className="px-6 py-4 text-center">Seats</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e2e8f0] bg-white">
                                {globalBookings
                                  .filter((booking) => {
                                    const search = globalTravelersSearch.toLowerCase();
                                    return (
                                      booking.travelerId?.name?.toLowerCase().includes(search) ||
                                      booking.travelerId?.email?.toLowerCase().includes(search) ||
                                      booking.travelerId?.phone?.toLowerCase().includes(search) ||
                                      booking.tripTitle?.toLowerCase().includes(search)
                                    );
                                  })
                                  .map((b) => (
                                    <tr key={b._id} className="hover:bg-[#f8fafc] transition duration-150">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          {b.travelerId?.avatarUrl ? (
                                            <img
                                              src={resolveMediaUrl(b.travelerId.avatarUrl)}
                                              alt={b.travelerId?.name}
                                              className="h-8 w-8 rounded-full object-cover border border-[#e2e8f0]"
                                            />
                                          ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
                                              {b.travelerId?.name?.charAt(0) || "T"}
                                            </div>
                                          )}
                                          <div>
                                            <p className="font-semibold text-on-surface">{b.travelerId?.name || "Guest traveler"}</p>
                                            <p className="text-[9px] font-bold text-secondary uppercase">
                                              Trust score: {b.travelerId?.trustScore ? `${b.travelerId.trustScore}/10` : "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <p className="font-semibold text-on-surface truncate max-w-[180px]">{b.tripTitle}</p>
                                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">ID: {b._id.substring(18)}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <p className="text-on-surface font-semibold">{b.travelerId?.phone || "No phone"}</p>
                                        <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{b.travelerId?.email || "No email"}</p>
                                      </td>
                                      <td className="px-6 py-4 text-center font-bold text-primary">{b.seatsBooked || 1}</td>
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                          b.status === "confirmed" ? "bg-[#e2efe9] text-primary" : "bg-error-container/20 text-error"
                                        }`}>
                                          {b.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <Link
                                          to={`/chat?room=${encodeURIComponent(`trip_${b.tripId}`)}`}
                                          className="inline-flex items-center gap-1 rounded bg-primary/5 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-on-primary transition"
                                        >
                                          <span className="material-symbols-outlined text-xs">chat</span>
                                          Message
                                        </Link>
                                      </td>
                                    </tr>
                                  ))}
                                {!globalBookings.length && (
                                  <tr>
                                    <td colSpan="6" className="py-12 text-center text-xs font-medium text-on-surface-variant/50">
                                      No passengers found. Publish active listings to register travelers.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {activeView === "analytics" && (
                  <section className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-on-surface">
                          Seat Map Occupancy
                        </h3>
                        <p className="text-[11px] font-medium text-on-surface-variant/50">
                          Visual mapping of cabin seats and passenger details
                        </p>

                        <div className="mt-4">
                          <select
                            value={selectedSeatTripId}
                            onChange={(e) => setSelectedSeatTripId(e.target.value)}
                            className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-xs text-on-surface outline-none"
                          >
                            <option value="">Select a trip to map layout</option>
                            {trips.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.title} ({t.totalSeats - t.availableSeats}/{t.totalSeats} filled)
                              </option>
                            ))}
                          </select>
                        </div>

                        {isSeatMapLoading ? (
                          <div className="py-12">
                            <LoadingPanel label="Loading seat configurations..." variant="grid" />
                          </div>
                        ) : selectedSeatTripId ? (
                          <div className="mt-5 space-y-4">
                            <div className="relative mx-auto max-w-[260px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
                              {/* Driver / Cabin row */}
                              <div className="mb-6 flex justify-between border-b border-[#e2e8f0] pb-3">
                                <div className="flex items-center justify-center rounded bg-[#e2e8f0] px-2 py-0.5 text-[9px] font-semibold text-on-surface-variant">
                                  CABIN FRONT
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <span className="material-symbols-outlined text-base">steering</span>
                                </div>
                              </div>

                              {/* Seats Grid */}
                              <div className="grid grid-cols-3 gap-3">
                                {(() => {
                                  const trip = trips.find((t) => t._id === selectedSeatTripId);
                                  const total = trip ? safeNumber(trip.totalSeats, 12) : 12;

                                  const seatsArray = [];
                                  let bookingIndex = 0;
                                  let seatCount = 0;

                                  for (let i = 0; i < total; i++) {
                                    if (bookingIndex < seatMapBookings.length) {
                                      const booking = seatMapBookings[bookingIndex];
                                      seatsArray.push({
                                        seatNumber: i + 1,
                                        status: booking.status === "confirmed" ? "confirmed" : "pending",
                                        traveler: booking.travelerId,
                                        booking,
                                      });

                                      seatCount++;
                                      if (seatCount >= (booking.seatsBooked || 1)) {
                                        bookingIndex++;
                                        seatCount = 0;
                                      }
                                    } else {
                                      seatsArray.push({
                                        seatNumber: i + 1,
                                        status: "available",
                                        traveler: null,
                                        booking: null,
                                      });
                                    }
                                  }

                                  return seatsArray.map((seat) => (
                                    <button
                                      key={seat.seatNumber}
                                      onClick={() => seat.traveler && setSelectedSeatTraveler(seat.traveler)}
                                      className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-[10px] font-semibold transition ${
                                        seat.status === "confirmed"
                                          ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                                          : seat.status === "pending"
                                            ? "border-secondary/20 bg-secondary/5 text-secondary hover:bg-secondary/10"
                                            : "border-dashed border-[#e2e8f0] bg-white text-on-surface-variant/40"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-sm">chair</span>
                                      <span>S{seat.seatNumber}</span>
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>

                            {selectedSeatTraveler && (
                              <div className="rounded-lg border border-secondary/20 bg-secondary/[0.02] p-4 text-xs animate-fadeIn">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold text-primary">{selectedSeatTraveler.name}</h4>
                                    <p className="text-on-surface-variant/80 mt-0.5">Email: {selectedSeatTraveler.email}</p>
                                    <p className="text-on-surface-variant/80">Contact: {selectedSeatTraveler.phone || "N/A"}</p>
                                    <p className="mt-1.5 text-[10px] font-bold text-secondary uppercase">
                                      Trust: {selectedSeatTraveler.trustScore}/10 • {selectedSeatTraveler.verificationStatus}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setSelectedSeatTraveler(null)}
                                    className="text-on-surface-variant/50 hover:text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-8 rounded-lg border border-dashed border-[#e2e8f0] py-16 text-center text-xs font-medium text-on-surface-variant/50">
                            Select an active trip departure to view seat layouts.
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-bold text-on-surface">
                            Earnings Simulator
                          </h3>
                          <p className="text-[11px] font-medium text-on-surface-variant/50">
                            Forecast seat sales fill rate relative to gross earnings
                          </p>

                          <div className="mt-6 space-y-5">
                            <div>
                              <div className="flex justify-between text-xs font-semibold text-on-surface mb-2">
                                <span>Target Capacity Fill</span>
                                <span className="text-secondary font-bold">{simulatedOccupancy}%</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="100"
                                step="5"
                                value={simulatedOccupancy}
                                onChange={(e) => setSimulatedOccupancy(Number(e.target.value))}
                                className="w-full accent-primary h-1 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            {(() => {
                              const avgPrice = trips.length
                                ? trips.reduce((sum, t) => sum + t.pricePerPerson, 0) / trips.length
                                : 7500;
                              const totalCap = trips.reduce((sum, t) => sum + t.totalSeats, 0) || 45;
                              const projectedRevenue = Math.round(totalCap * (simulatedOccupancy / 100)) * avgPrice;
                              const platformFee = projectedRevenue * 0.1;
                              const netPayout = projectedRevenue - platformFee;

                              return (
                                <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-xs font-medium">
                                  <div className="flex justify-between border-b border-[#e2e8f0]/60 pb-2">
                                    <span className="text-on-surface-variant/80">Average Ticket Price:</span>
                                    <span className="font-bold text-on-surface">{formatINR(avgPrice)}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[#e2e8f0]/60 pb-2">
                                    <span className="text-on-surface-variant/80">Projected Occupancy:</span>
                                    <span className="font-bold text-on-surface">
                                      {Math.round(totalCap * (simulatedOccupancy / 100))} of {totalCap} bookings
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-b border-[#e2e8f0]/60 pb-2">
                                    <span className="text-on-surface-variant/80">Gross Sales Revenue:</span>
                                    <span className="font-bold text-primary">{formatINR(projectedRevenue)}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-[#e2e8f0]/60 pb-2">
                                    <span className="text-on-surface-variant/80">Platform Comm. (10%):</span>
                                    <span className="font-bold text-error">{formatINR(platformFee)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1">
                                    <span className="font-bold text-on-surface">Estimated Dispatch Balance:</span>
                                    <span className="font-bold text-secondary">{formatINR(netPayout)}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="mt-6 rounded-lg bg-primary/[0.01] border border-primary/10 p-4 text-[11px] leading-relaxed text-on-surface-variant/80 font-medium">
                          💡 **Pro-Tip:** Leverage content marketing via the Social Profile tab. Organizers who upload 2+ visual stories per week experience average fill rates exceeding **85%**.
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeView === "ai_copilot" && (
                  <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-on-surface">Prompt Templates</h4>
                          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wide mt-0.5">
                            Preloaded system tasks
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {[
                            {
                              label: "Itinerary Safety Audit",
                              text: "Audit my trip itinerary to ensure we have emergency contingency plans and clear group safety guidelines.",
                              intent: "safety",
                            },
                            {
                              label: "Traveler Announcement",
                              text: "Draft a departures announcement for our passenger chat room specifying meeting details, rules, and timings.",
                              intent: "qa",
                            },
                            {
                              label: "Instagram Caption",
                              text: "Create a highly engaging Instagram caption promoting my group travel trip with local adventure details and tags.",
                              intent: "qa",
                            },
                            {
                              label: "Packing Checklist",
                              text: "Generate a recommended packing list for my travelers based on the destination's climate.",
                              intent: "packing",
                            },
                          ].map((tmpl) => (
                            <button
                              key={tmpl.label}
                              type="button"
                              onClick={() => {
                                setAiIntent(tmpl.intent);
                                setAiQuestion(tmpl.text);
                              }}
                              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-primary/[0.02] hover:border-primary/20 p-3 text-left text-xs font-semibold text-on-surface-variant transition duration-150"
                            >
                              {tmpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col h-[520px] rounded-lg border border-[#e2e8f0] bg-white">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
                          {aiChat.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-primary text-on-primary rounded-tr-none font-medium"
                                    : "bg-[#f8fafc] text-on-surface border border-[#e2e8f0] rounded-tl-none copilot-markdown"
                                }`}
                              >
                                {msg.role === "user" ? (
                                  msg.content
                                ) : (
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                )}
                              </div>
                            </div>
                          ))}
                          {aiIsLoading && (
                            <div className="flex justify-start">
                              <div className="flex items-center gap-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3.5 py-2.5 text-xs text-on-surface-variant font-semibold">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary [animation-delay:0.2s]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary [animation-delay:0.4s]" />
                                Thinking...
                              </div>
                            </div>
                          )}
                        </div>

                        <form onSubmit={handleAskAICopilot} className="border-t border-[#e2e8f0] p-3 bg-[#f8fafc] rounded-b-lg">
                          <div className="flex gap-2">
                            <select
                              value={aiIntent}
                              onChange={(e) => setAiIntent(e.target.value)}
                              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs text-on-surface outline-none"
                            >
                              <option value="qa">Instant Q&A</option>
                              <option value="packing">Packing</option>
                              <option value="safety">Safety Check</option>
                              <option value="route">Routes</option>
                            </select>
                            <input
                              value={aiQuestion}
                              onChange={(e) => setAiQuestion(e.target.value)}
                              placeholder="Ask AI Copilot to draft communications, audit safety, or plan packing..."
                              className="flex-1 rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary/30"
                              disabled={aiIsLoading}
                            />
                            <button
                              type="submit"
                              disabled={aiIsLoading}
                              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition disabled:opacity-50"
                            >
                              Send
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </section>
                )}

                {activeView === "social" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <section className="space-y-6">
                      <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-on-surface">
                          Media Composer
                        </h3>
                        <p className="text-[11px] font-medium text-on-surface-variant/50">
                          Publish marketing content to your traveler feed
                        </p>

                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                          <div className="aspect-square overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                            {selectedComposerPreview ? (
                              selectedComposerPreview.isVideo ? (
                                <video src={selectedComposerPreview.url} controls className="h-full w-full object-cover" />
                              ) : (
                                <img src={selectedComposerPreview.url} alt="Preview" className="h-full w-full object-cover" />
                              )
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-on-surface-variant/30">
                                <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider">Select Media</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-between py-1">
                            <div className="space-y-4">
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Caption & Tags</p>
                                <textarea
                                  value={caption}
                                  onChange={(e) => setCaption(e.target.value)}
                                  placeholder="Tell the story of this trip..."
                                  className="min-h-[120px] w-full rounded-lg border border-[#e2e8f0] bg-white p-3.5 text-xs text-on-surface outline-none transition focus:border-primary/30"
                                />
                              </div>
                              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] p-5 text-primary text-xs font-semibold transition hover:bg-primary/[0.01] hover:border-primary/30">
                                <span className="material-symbols-outlined text-sm">upload_file</span>
                                <span className="text-[11px] font-semibold uppercase">Upload Files</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*,video/*"
                                  onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            <button
                              onClick={submitPost}
                              disabled={isPosting || !mediaFiles.length}
                              className="mt-6 w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-on-primary hover:bg-primary/95 transition disabled:opacity-50"
                            >
                              {isPosting ? "Publishing..." : "Publish Post"}
                            </button>
                          </div>
                        </div>

                        {mediaFiles.length > 0 ? (
                          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {composerPreviews.map((preview, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedComposerPreviewIndex(index)}
                                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${index === selectedComposerPreviewIndex ? "border-primary" : "border-transparent"}`}
                              >
                                {preview.isVideo ? (
                                  <div className="flex h-full w-full items-center justify-center bg-on-surface/10">
                                    <span className="material-symbols-outlined text-xs">play_circle</span>
                                  </div>
                                ) : (
                                  <img src={preview.url} className="h-full w-full object-cover" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </article>

                      <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-on-surface">
                          Gallery Archive
                        </h3>
                        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {posts.map((post) => (
                            <div key={post._id} className="group relative aspect-square overflow-hidden rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                              <img
                                src={optimizeCloudinaryImage(resolveMediaUrl(post.media[0]?.url), "f_auto,q_auto,w_600")}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                alt="Social post"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <button
                                  onClick={() => removePost(post._id)}
                                  disabled={deletingPostId === post._id}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-error text-on-error shadow-lg transition hover:bg-error/90 disabled:opacity-60"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          {posts.length === 0 ? (
                            <div className="col-span-full rounded-lg border border-dashed border-[#e2e8f0] bg-[#f8fafc] py-16 text-center">
                              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">photo_library</span>
                              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40">No posts published yet</p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    </section>

                    <aside className="space-y-6">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-on-surface">
                          Profile Audit
                        </h3>
                        <div className="mt-6 space-y-5">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">verified</span>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Business Name</p>
                              <p className="mt-0.5 text-xs font-semibold text-on-surface">{organizer?.businessName || "Pending Setup"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">assignment_ind</span>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Official License</p>
                              <p className="mt-0.5 text-xs font-semibold text-on-surface">{organizer?.licenseUrl ? "Active & Verified" : "Verification Pending"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">contact_mail</span>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Support Email</p>
                              <p className="mt-0.5 text-xs font-semibold text-on-surface">{user?.email}</p>
                            </div>
                          </div>
                        </div>
                        <Link to={previewProfileUrl} target="_blank" className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white py-2.5 text-xs font-semibold text-primary hover:bg-[#f8fafc] transition duration-150">
                          Public Profile View
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </Link>
                      </div>
                    </aside>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-3">
              <h3 className="text-base font-bold text-on-surface">
                Request Settlement
              </h3>
              <button
                onClick={() => setPayoutModalOpen(false)}
                className="text-on-surface-variant/50 hover:text-on-surface transition"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="mt-5 space-y-3.5">
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Requested Amount</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {formatINR(safeNumber(finance?.totals?.settlementEstimate))}
                </p>
              </div>

              <div className="rounded-lg border border-[#e2e8f0] p-4 space-y-2.5 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant/80">Destination Account:</span>
                  <span className="font-semibold text-on-surface">HDFC Bank (**** 9876)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant/80">Business Entity:</span>
                  <span className="font-semibold text-on-surface">{organizer?.businessName || user?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant/80">GSTIN Registry:</span>
                  <span className="font-semibold text-secondary">{organizer?.gstNumber || "Not Provided"}</span>
                </div>
              </div>

              <div className="rounded-lg bg-secondary/[0.02] border border-secondary/15 p-4 text-[10px] leading-relaxed text-on-surface-variant/85 font-medium">
                ⚠️ **Note:** Funds usually clear within 2-4 business days. Ensure bank info and tax declarations are kept current to avoid dispatch blocks.
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="flex-1 rounded-lg border border-[#e2e8f0] bg-white py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-[#f8fafc] transition"
                disabled={isRequestingPayout}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestPayout}
                className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-semibold text-on-primary hover:bg-primary/95 transition flex items-center justify-center gap-1.5"
                disabled={isRequestingPayout}
              >
                {isRequestingPayout ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  "Confirm & Send"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
