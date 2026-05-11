import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
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
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        <aside className="hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low md:flex">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[1.6rem]">business_center</span>
              </div>
              <div>
                <h2 className="font-headline text-sm font-black uppercase tracking-[0.1em] text-primary">
                  Organizer <span className="text-secondary">Pro</span>
                </h2>
                <p className="text-[10px] font-bold text-on-surface-variant/60">Business Suite</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 pt-4">
            {[
              ["overview", "Overview", "space_dashboard"],
              ["trips", "My Posted Trips", "inventory_2"],
              ["social", "Social Profile", "photo_library"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  activeView === key
                    ? "bg-primary text-on-primary shadow-[0_8px_16px_rgba(1,45,29,0.15)]"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <span className="material-symbols-outlined text-[1.2rem]">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="mx-6 mb-8 rounded-2xl border border-outline-variant/30 bg-surface-container-high/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-on-primary">
                {organizer?.businessName?.charAt(0) || user?.name?.charAt(0) || "O"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-on-surface">{organizer?.businessName || user?.name || "Organizer"}</p>
                <div className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${approvalTone}`}>
                  {organizer?.approvalStatus || "pending"}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-outline-variant/10 pt-3">
              <p className="truncate text-[9px] font-bold text-on-surface-variant">GST: {organizer?.gstNumber || "N/A"}</p>
              <p className="truncate text-[9px] font-bold text-on-surface-variant">Email: {user?.email || "N/A"}</p>
            </div>
          </div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface/80 backdrop-blur-xl md:hidden">
          <nav className="flex items-center justify-around px-2 py-3">
            {[
              ["overview", "space_dashboard", "Home"],
              ["trips", "inventory_2", "Trips"],
              ["social", "photo_library", "Social"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`relative flex flex-col items-center gap-1 transition-all ${
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
                <h1 className="font-headline text-2xl font-black tracking-tight text-on-surface capitalize sm:text-3xl">
                  {activeView.replace("_", " ")} <span className="text-secondary">Dashboard</span>
                </h1>
                <p className="mt-1 max-w-xl text-[11px] text-on-surface-variant opacity-70 sm:text-sm">
                  {activeView === "overview" && "Operations, finance, payouts, and action center for organizer workflows."}
                  {activeView === "trips" && "Search, filter, and manage trip lifecycle, buyers, and trip communication."}
                  {activeView === "social" && "Publish travel reels and photos to engage your audience."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canCreateTrips ? (
                  <Link
                    to="/trips/create"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02] sm:flex-none sm:px-6 sm:py-2.5 sm:text-[11px]"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Create Trip
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={true}
                    className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-surface-container px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 sm:flex-none sm:px-6 sm:py-2.5 sm:text-[11px]"
                    title="Create Trip is enabled only for approved organizers"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Create Trip
                  </button>
                )}
                <button
                  onClick={() => loadDashboard(tripQuery)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-highest sm:h-10 sm:w-10"
                >
                  <span className="material-symbols-outlined text-[1.2rem]">refresh</span>
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
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                      {dashboard.cards.map((card) => (
                        <article
                          key={card.label}
                          className="relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-sm transition hover:shadow-md sm:rounded-3xl sm:p-6"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 sm:text-[10px]">
                                {card.label}
                              </p>
                              <p className="mt-2 font-headline text-lg font-black text-on-surface sm:mt-3 sm:text-2xl">
                                {card.value}
                              </p>
                              {card.helper ? (
                                <p className="mt-1 text-[7px] font-bold uppercase tracking-widest text-secondary sm:text-[9px]">
                                  {card.helper}
                                </p>
                              ) : null}
                            </div>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${card.tone === "primary" ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                              <span className="material-symbols-outlined text-lg sm:text-[1.4rem]">{card.icon}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                      <section className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
                        <h3 className="font-headline text-lg font-black text-on-surface sm:text-xl">
                          Finance & <span className="text-secondary">Payouts</span>
                        </h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 sm:text-xs">
                          Paid vs pending vs refund pipeline
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-surface-container-low p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">Settlement Estimate</p>
                            <p className="mt-2 font-headline text-xl font-black text-primary">{formatINR(safeNumber(finance?.totals?.settlementEstimate))}</p>
                          </div>
                          <div className="rounded-2xl bg-primary p-4 text-on-primary">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-primary/70">Gross Paid</p>
                            <p className="mt-2 font-headline text-xl font-black">{formatINR(safeNumber(finance?.totals?.grossPaid))}</p>
                          </div>
                          <div className="rounded-2xl bg-surface-container-low p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-outline">Pending Payments</p>
                            <p className="mt-2 font-headline text-xl font-black text-primary">{formatINR(safeNumber(finance?.totals?.pendingPayment))}</p>
                          </div>
                          <div className="rounded-2xl bg-error-container p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-error/90">Refund Required</p>
                            <p className="mt-2 font-headline text-xl font-black text-error">{formatINR(safeNumber(finance?.totals?.refundRequired))}</p>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {Object.entries(finance?.counts?.paymentStatus || {}).map(([status, count]) => (
                            <span key={status} className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-on-surface-variant">
                              {PAYMENT_STATUS_LABELS[status] || status}: {safeNumber(count)}
                            </span>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                          <h3 className="font-headline text-lg font-black text-on-surface">
                            Notifications <span className="text-secondary">Center</span>
                          </h3>
                          <div className="mt-5 space-y-3">
                            {notifications.length ? (
                              notifications.map((item) => (
                                <article key={item._id} className={`rounded-2xl border px-4 py-3 ${item.isRead ? "border-outline-variant/20 bg-surface-container-lowest" : "border-primary/20 bg-primary/5"}`}>
                                  <p className="text-xs font-bold text-on-surface">{item.message}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-on-surface-variant/70">
                                      {formatDateLabel(item.createdAt)}
                                    </span>
                                    {!item.isRead ? (
                                      <button
                                        onClick={() => markNotificationRead(item._id)}
                                        disabled={markingReadId === item._id}
                                        className="rounded-lg bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-on-primary disabled:opacity-60"
                                      >
                                        {markingReadId === item._id ? "..." : "Mark Read"}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-secondary">Read</span>
                                    )}
                                  </div>
                                </article>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low p-5 text-center text-xs font-bold text-on-surface-variant">
                                No notifications yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-3xl border border-outline-variant/10 bg-secondary/5 p-6">
                          <p className="mb-2 text-center text-[10px] font-black uppercase tracking-widest text-secondary">
                            Marketplace Status
                          </p>
                          <p className="text-center text-xs leading-relaxed text-on-surface-variant">
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
                  <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-outline-variant/10 bg-surface-container-low/30 px-6 py-6 sm:px-8">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-headline text-lg font-black text-on-surface sm:text-xl">
                            Inventory <span className="text-secondary">Control</span>
                          </h3>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 sm:text-[10px]">
                            Search, filter, lifecycle, and ops shortcuts
                          </p>
                        </div>
                        {canCreateTrips ? (
                          <Link to="/trips/create" className="flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-primary shadow-md">
                            New Listing
                          </Link>
                        ) : (
                          <button type="button" disabled={true} className="cursor-not-allowed rounded-xl bg-surface-container px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">
                            Approval Pending
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
                        <input
                          value={tripSearchInput}
                          onChange={(e) => setTripSearchInput(e.target.value)}
                          placeholder="Search by title, source, destination..."
                          className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary/40"
                        />
                        <select
                          value={tripQuery.status}
                          onChange={(e) => setTripQuery((prev) => ({ ...prev, page: 1, status: e.target.value }))}
                          className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-2.5 text-sm text-on-surface"
                        >
                          <option value="">All statuses</option>
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
                          className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-2.5 text-sm text-on-surface"
                        >
                          <option value="createdAt:desc">Newest First</option>
                          <option value="createdAt:asc">Oldest First</option>
                          <option value="startDate:asc">Departure Soon</option>
                          <option value="pricePerPerson:desc">Highest Price</option>
                          <option value="pricePerPerson:asc">Lowest Price</option>
                        </select>
                        <select
                          value={String(tripQuery.limit)}
                          onChange={(e) => setTripQuery((prev) => ({ ...prev, page: 1, limit: Number(e.target.value) }))}
                          className="rounded-xl border border-outline-variant/20 bg-surface px-4 py-2.5 text-sm text-on-surface"
                        >
                          <option value="10">10 / page</option>
                          <option value="20">20 / page</option>
                          <option value="50">50 / page</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setTripQuery((prev) => ({ ...prev, page: 1, q: tripSearchInput.trim() }))}
                          className="rounded-xl bg-primary px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-primary"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {isTripsLoading ? (
                      <div className="px-6 py-10 sm:px-8">
                        <LoadingPanel label="Loading trips..." variant="list" />
                      </div>
                    ) : (
                      <div className="space-y-4 px-6 py-6 sm:px-8">
                        {trips.length ? (
                          trips.map((trip) => {
                            const soldSeats = Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats));
                            const occupancy = trip.totalSeats ? Math.min(100, Math.round((soldSeats / trip.totalSeats) * 100)) : 0;
                            const isActing = actingTripId === trip._id;
                            return (
                              <article key={trip._id} className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="truncate font-headline text-lg font-black text-on-surface">{trip.title}</h4>
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${badgeStylesByStatus[trip.status] || "bg-surface-container text-on-surface-variant"}`}>
                                        {trip.status}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs font-bold text-primary">
                                      {trip.source} <span className="mx-1">→</span> {trip.destination}
                                    </p>
                                    <p className="mt-1 text-[11px] font-bold text-on-surface-variant">
                                      Departure: {formatDateLabel(trip.startDate)} • Price: {formatINR(trip.pricePerPerson)}
                                    </p>
                                  </div>
                                  <div className="w-full lg:w-56">
                                    <div className="mb-1.5 flex items-center justify-between">
                                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-on-surface-variant">Occupancy</p>
                                      <p className="text-[11px] font-black text-secondary">{occupancy}%</p>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                                      <div className="h-full rounded-full bg-secondary" style={{ width: `${occupancy}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] font-bold text-on-surface-variant">{soldSeats}/{trip.totalSeats} seats filled</p>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {trip.status === "active" && !trip.startedAt ? (
                                    <button
                                      onClick={() => startTrip(trip._id)}
                                      disabled={isActing}
                                      className="rounded-xl bg-secondary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-secondary disabled:opacity-60"
                                    >
                                      {isActing ? "Working..." : "Start Trip"}
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
                                      className="rounded-xl bg-error-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-error disabled:opacity-60"
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
                                      className="rounded-xl bg-surface-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant disabled:opacity-60"
                                    >
                                      Close Trip
                                    </button>
                                  ) : null}
                                  {trip.status !== "active" ? (
                                    <button
                                      onClick={() => deleteTrip(trip._id)}
                                      disabled={isActing}
                                      className="rounded-xl bg-error px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-error disabled:opacity-60"
                                    >
                                      Delete Trip
                                    </button>
                                  ) : null}
                                  <Link to={`/dashboard/organizer/trips/${trip._id}`} className="rounded-xl bg-primary px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-on-primary">
                                    Buyers
                                  </Link>
                                  <Link to={`/chat?room=${encodeURIComponent(`trip_${trip._id}`)}`} className="rounded-xl bg-surface-container px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                                    Trip Chat
                                  </Link>
                                  <Link to={`/trips/${trip._id}/edit`} className="rounded-xl bg-surface-container px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
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

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/15 bg-surface p-4">
                          <p className="text-xs font-bold text-on-surface-variant">
                            Showing page {tripPagination.page} of {tripPagination.totalPages} • {tripPagination.total} total trips
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setTripQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                              disabled={tripPagination.page <= 1}
                              className="rounded-lg bg-surface-container px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              onClick={() => setTripQuery((prev) => ({ ...prev, page: Math.min(tripPagination.totalPages, prev.page + 1) }))}
                              disabled={tripPagination.page >= tripPagination.totalPages}
                              className="rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeView === "social" && (
                  <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                    <section className="space-y-8">
                      <article className="rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                        <h3 className="font-headline text-xl font-black text-on-surface">
                          Media <span className="text-secondary">Composer</span>
                        </h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                          Publish to your traveler feed
                        </p>

                        <div className="mt-8 grid gap-8 lg:grid-cols-2">
                          <div className="aspect-square overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-low">
                            {selectedComposerPreview ? (
                              selectedComposerPreview.isVideo ? (
                                <video src={selectedComposerPreview.url} controls className="h-full w-full object-cover" />
                              ) : (
                                <img src={selectedComposerPreview.url} alt="Preview" className="h-full w-full object-cover" />
                              )
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center text-outline-variant/40">
                                <span className="material-symbols-outlined text-6xl">add_a_photo</span>
                                <p className="mt-3 text-[10px] font-black uppercase tracking-widest">Select Media</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-between py-2">
                            <div className="space-y-6">
                              <div>
                                <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-outline-variant">Caption & Tags</p>
                                <textarea
                                  value={caption}
                                  onChange={(e) => setCaption(e.target.value)}
                                  placeholder="Tell the story of this trip..."
                                  className="min-h-[140px] w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 text-sm text-on-surface outline-none transition focus:border-primary/40"
                                />
                              </div>
                              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/20 bg-surface-container-lowest p-6 text-primary transition hover:bg-surface-container">
                                <span className="material-symbols-outlined">upload_file</span>
                                <span className="text-[11px] font-black uppercase tracking-widest">Upload Files</span>
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
                              className="mt-8 w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary shadow-xl transition hover:scale-[1.02] disabled:opacity-50"
                            >
                              {isPosting ? "Broadcasting..." : "Publish Post"}
                            </button>
                          </div>
                        </div>

                        {mediaFiles.length > 0 ? (
                          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                            {composerPreviews.map((preview, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedComposerPreviewIndex(index)}
                                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${index === selectedComposerPreviewIndex ? "border-primary" : "border-transparent"}`}
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

                      <article className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
                        <h3 className="font-headline text-lg font-black text-on-surface sm:text-xl">
                          Gallery <span className="text-secondary">Archive</span>
                        </h3>
                        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                          {posts.map((post) => (
                            <div key={post._id} className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-container">
                              <img
                                src={optimizeCloudinaryImage(resolveMediaUrl(post.media[0]?.url), "f_auto,q_auto,w_600")}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                alt="Social post"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <button
                                  onClick={() => removePost(post._id)}
                                  disabled={deletingPostId === post._id}
                                  className="flex h-10 w-10 items-center justify-center rounded-full bg-error text-on-error shadow-lg transition disabled:opacity-60"
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          {posts.length === 0 ? (
                            <div className="col-span-full rounded-3xl border border-dashed border-outline-variant/10 bg-surface-container-lowest py-20 text-center">
                              <span className="material-symbols-outlined text-5xl text-outline-variant/30">photo_library</span>
                              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">No posts published yet</p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    </section>

                    <aside className="space-y-6">
                      <div className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <h3 className="font-headline text-lg font-black text-on-surface">
                          Profile <span className="text-secondary">Audit</span>
                        </h3>
                        <div className="mt-6 space-y-5">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">verified</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Business Name</p>
                              <p className="mt-0.5 text-xs font-bold text-on-surface-variant">{organizer?.businessName || "Pending Setup"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">assignment_ind</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Official License</p>
                              <p className="mt-0.5 text-xs font-bold text-on-surface-variant">{organizer?.licenseUrl ? "Active & Verified" : "Verification Pending"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 text-sm text-primary">contact_mail</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Support Email</p>
                              <p className="mt-0.5 text-xs font-bold text-on-surface-variant">{user?.email}</p>
                            </div>
                          </div>
                        </div>
                        <Link to={previewProfileUrl} target="_blank" className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-container-low py-4 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-surface-container">
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
    </MainLayout>
  );
}
