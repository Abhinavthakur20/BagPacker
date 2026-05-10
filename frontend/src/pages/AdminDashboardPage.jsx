import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api, resolveMediaUrl } from "../lib/api";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const paginateItems = (items, page, limit) => {
  const list = Array.isArray(items) ? items : [];
  const safeLimit = Math.max(1, Number(limit) || 1);
  const totalPages = Math.max(1, Math.ceil(list.length / safeLimit));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    items: list.slice(start, start + safeLimit),
    page: safePage,
    totalPages,
    total: list.length,
  };
};

const toTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const toCsvCell = (value) => {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function AdminDashboardPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);

  const [activeTab, setActiveTab] = useState("overview");
  const [moderationSection, setModerationSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(50);
  const [userPagination, setUserPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [pendingOrganizers, setPendingOrganizers] = useState([]);
  const [organizerPage, setOrganizerPage] = useState(1);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [verificationPage, setVerificationPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [tripListings, setTripListings] = useState([]);
  const [paymentMonitor, setPaymentMonitor] = useState({ items: [], summary: {} });
  const [joinActivity, setJoinActivity] = useState({
    companionRequests: [],
    bookingStatusSummary: {},
  });
  const [reviewsOverview, setReviewsOverview] = useState({ items: [], summary: {} });
  const [operationsSection, setOperationsSection] = useState("trips");
  const [opsLoaded, setOpsLoaded] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [operationsSearch, setOperationsSearch] = useState("");
  const [operationsFrom, setOperationsFrom] = useState("");
  const [operationsTo, setOperationsTo] = useState("");
  const [tripStatusFilter, setTripStatusFilter] = useState("all");
  const [tripPaymentFilter, setTripPaymentFilter] = useState("all");
  const [joinStatusFilter, setJoinStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [tripPage, setTripPage] = useState(1);
  const [joinPage, setJoinPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAdminData = async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);
      setError("");
      const [allUsers, organizers, verifications, userReports] = await Promise.all([
          api.get(`/admin/users?page=${userPage}&limit=${userLimit}`),
          api.get("/admin/organizers/pending"),
          api.get("/admin/verifications/pending"),
          api.get("/admin/reports"),
        ]);

      setUsers(Array.isArray(allUsers?.items) ? allUsers.items : []);
      setUserPagination({
        page: Number(allUsers?.pagination?.page || userPage),
        limit: Number(allUsers?.pagination?.limit || userLimit),
        total: Number(allUsers?.pagination?.total || 0),
        totalPages: Math.max(1, Number(allUsers?.pagination?.totalPages || 1)),
      });
      setPendingOrganizers(Array.isArray(organizers) ? organizers : []);
      setPendingVerifications(Array.isArray(verifications) ? verifications : []);
      setReports(Array.isArray(userReports) ? userReports : []);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isLoggedIn, userPage, userLimit]);

  const moderationLimit = 20;
  const organizerSlice = useMemo(
    () => paginateItems(pendingOrganizers, organizerPage, moderationLimit),
    [pendingOrganizers, organizerPage],
  );
  const verificationSlice = useMemo(
    () => paginateItems(pendingVerifications, verificationPage, moderationLimit),
    [pendingVerifications, verificationPage],
  );
  const reportSlice = useMemo(
    () => paginateItems(reports, reportPage, moderationLimit),
    [reports, reportPage],
  );

  useEffect(() => {
    setOrganizerPage((current) => Math.min(current, organizerSlice.totalPages));
  }, [organizerSlice.totalPages]);

  useEffect(() => {
    setVerificationPage((current) => Math.min(current, verificationSlice.totalPages));
  }, [verificationSlice.totalPages]);

  useEffect(() => {
    setReportPage((current) => Math.min(current, reportSlice.totalPages));
  }, [reportSlice.totalPages]);

  const stats = useMemo(
    () => [
      ["Users", userPagination.total, "groups"],
      ["Pending Organizers", pendingOrganizers.length, "pending_actions"],
      ["Open Reports", reports.filter((item) => item.status !== "resolved").length, "gavel"],
      ["Paid Bookings", safeNumber(paymentMonitor?.summary?.paid?.count), "payments"],
    ],
    [userPagination.total, pendingOrganizers, reports, paymentMonitor],
  );

  const updateOrganizerStatus = async (id, approvalStatus) => {
    const result = await showConfirmAlert({
      title: `${approvalStatus === "approved" ? "Approve" : "Reject"} organizer?`,
      text: "This will update organizer access.",
      confirmButtonText: approvalStatus === "approved" ? "Approve" : "Reject",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/admin/organizers/${id}/approve`, { approvalStatus });
      setSuccessMessage(`Organizer ${approvalStatus} successfully.`);
      await showSuccessAlert("Organizer updated", `Organizer ${approvalStatus} successfully.`);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  const updateVerificationStatus = async (id, verificationStatus) => {
    const result = await showConfirmAlert({
      title: `${verificationStatus === "verified" ? "Verify" : "Reject"} document?`,
      text: "This will update user verification status.",
      confirmButtonText: verificationStatus === "verified" ? "Verify" : "Reject",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/admin/verifications/${id}`, { verificationStatus });
      setSuccessMessage(`Verification ${verificationStatus} successfully.`);
      await showSuccessAlert(
        "Verification updated",
        `Verification ${verificationStatus} successfully.`,
      );
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  const resolveReport = async (id, adminAction) => {
    const result = await showConfirmAlert({
      title: `Resolve report as ${adminAction}?`,
      text: "This action will be recorded on the report.",
      confirmButtonText: "Resolve",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/admin/reports/${id}/resolve`, { adminAction });
      setSuccessMessage(`Report resolved with action: ${adminAction}.`);
      await showSuccessAlert("Report resolved", `Action applied: ${adminAction}.`);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  const updateTripLifecycle = async (id, action) => {
    const result = await showConfirmAlert({
      title: `Mark trip as ${action}?`,
      text: "This updates trip lifecycle status.",
      confirmButtonText: "Update",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/admin/trip-listings/${id}/lifecycle`, { action });
      setSuccessMessage(`Trip updated with action: ${action}.`);
      await showSuccessAlert("Trip updated", `Action applied: ${action}.`);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  const handleToggleBan = async (id, currentStatus) => {
    const result = await showConfirmAlert({
      title: `${currentStatus ? "Unban" : "Ban"} user?`,
      text: `Are you sure you want to ${currentStatus ? "restore access for" : "suspend"} this user?`,
      confirmButtonText: currentStatus ? "Unban" : "Ban",
      confirmButtonColor: currentStatus ? "#124f38" : "#d32f2f",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/admin/users/${id}/toggle-ban`);
      setSuccessMessage(`User access updated successfully.`);
      await showSuccessAlert("Status Updated", `User has been ${currentStatus ? "unbanned" : "banned"}.`);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  const loadOperationsData = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setOpsLoading(true);
      const [tripRes, joinRes, paymentRes] = await Promise.all([
        api.get("/admin/trip-listings?page=1&limit=100").catch(() => null),
        api.get("/admin/join-activity").catch(() => null),
        api.get("/admin/payments?page=1&limit=100").catch(() => null),
      ]);

      if (tripRes) {
        setTripListings(Array.isArray(tripRes?.items) ? tripRes.items : []);
      }
      if (joinRes) {
        setJoinActivity({
          companionRequests: Array.isArray(joinRes?.companionRequests)
            ? joinRes.companionRequests
            : [],
          bookingStatusSummary:
            joinRes?.bookingStatusSummary && typeof joinRes.bookingStatusSummary === "object"
              ? joinRes.bookingStatusSummary
              : {},
        });
      }
      if (paymentRes) {
        setPaymentMonitor({
          items: Array.isArray(paymentRes?.items) ? paymentRes.items : [],
          summary: paymentRes?.summary && typeof paymentRes.summary === "object" ? paymentRes.summary : {},
        });
      }
      setOpsLoaded(true);
    } finally {
      setOpsLoading(false);
    }
  }, [isLoggedIn]);

  const exportRows = (filename, headers, rows) => {
    const csv = [headers.map(toCsvCell).join(",")]
      .concat(rows.map((row) => row.map(toCsvCell).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === "operations" && !opsLoaded && !opsLoading) {
      loadOperationsData();
    }
  }, [activeTab, opsLoaded, opsLoading, loadOperationsData]);

  const tripStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tripListings.map((trip) => String(trip?.status || "").toLowerCase()).filter(Boolean),
        ),
      ),
    [tripListings],
  );
  const joinStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (joinActivity?.companionRequests || [])
            .map((item) => String(item?.status || "").toLowerCase())
            .filter(Boolean),
        ),
      ),
    [joinActivity],
  );
  const paymentStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (paymentMonitor?.items || [])
            .map((item) => String(item?.paymentStatus || "").toLowerCase())
            .filter(Boolean),
        ),
      ),
    [paymentMonitor],
  );

  const operationsQuery = operationsSearch.trim().toLowerCase();
  const fromTs = toTimestamp(operationsFrom ? `${operationsFrom}T00:00:00` : null);
  const toTs = toTimestamp(operationsTo ? `${operationsTo}T23:59:59.999` : null);

  const isInDateRange = (value) => {
    const timestamp = toTimestamp(value);
    if ((fromTs || toTs) && timestamp === null) return false;
    if (fromTs && timestamp < fromTs) return false;
    if (toTs && timestamp > toTs) return false;
    return true;
  };

  const filteredTrips = useMemo(
    () =>
      tripListings.filter((trip) => {
        if (
          tripStatusFilter !== "all" &&
          String(trip?.status || "").toLowerCase() !== tripStatusFilter
        ) {
          return false;
        }
        if (tripPaymentFilter !== "all") {
          const paymentOn = trip?.paymentEnabled !== false;
          if (tripPaymentFilter === "enabled" && !paymentOn) return false;
          if (tripPaymentFilter === "disabled" && paymentOn) return false;
        }
        if (!isInDateRange(trip?.startedAt || trip?.createdAt || trip?.departureDate)) {
          return false;
        }
        if (!operationsQuery) return true;
        const haystack = [
          trip?.title,
          trip?.source,
          trip?.destination,
          trip?.organizerId?.name,
          trip?.transportType,
          trip?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(operationsQuery);
      }),
    [tripListings, tripStatusFilter, tripPaymentFilter, operationsQuery, fromTs, toTs],
  );

  const filteredJoinRequests = useMemo(
    () =>
      (joinActivity?.companionRequests || []).filter((item) => {
        if (
          joinStatusFilter !== "all" &&
          String(item?.status || "").toLowerCase() !== joinStatusFilter
        ) {
          return false;
        }
        if (!isInDateRange(item?.createdAt || item?.updatedAt)) {
          return false;
        }
        if (!operationsQuery) return true;
        const haystack = [
          item?.requesterId?.name,
          item?.requesterId?.email,
          item?.receiverId?.name,
          item?.receiverId?.email,
          item?.source,
          item?.destination,
          item?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(operationsQuery);
      }),
    [joinActivity, joinStatusFilter, operationsQuery, fromTs, toTs],
  );

  const filteredPayments = useMemo(
    () =>
      (paymentMonitor?.items || []).filter((item) => {
        if (
          paymentStatusFilter !== "all" &&
          String(item?.paymentStatus || "").toLowerCase() !== paymentStatusFilter
        ) {
          return false;
        }
        if (!isInDateRange(item?.createdAt || item?.updatedAt || item?.paidAt)) {
          return false;
        }
        if (!operationsQuery) return true;
        const haystack = [
          item?.tripId?.title,
          item?.travelerId?.name,
          item?.travelerId?.email,
          item?.paymentStatus,
          item?.status,
          item?.currency,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(operationsQuery);
      }),
    [paymentMonitor, paymentStatusFilter, operationsQuery, fromTs, toTs],
  );

  const tripSlice = useMemo(() => paginateItems(filteredTrips, tripPage, 20), [filteredTrips, tripPage]);
  const joinSlice = useMemo(
    () => paginateItems(filteredJoinRequests, joinPage, 20),
    [filteredJoinRequests, joinPage],
  );
  const paymentSlice = useMemo(
    () => paginateItems(filteredPayments, paymentPage, 20),
    [filteredPayments, paymentPage],
  );

  useEffect(() => setTripPage(1), [operationsQuery, operationsFrom, operationsTo, tripStatusFilter, tripPaymentFilter]);
  useEffect(() => setJoinPage(1), [operationsQuery, operationsFrom, operationsTo, joinStatusFilter]);
  useEffect(() => setPaymentPage(1), [operationsQuery, operationsFrom, operationsTo, paymentStatusFilter]);

  useEffect(() => {
    setTripPage((current) => Math.min(current, tripSlice.totalPages));
  }, [tripSlice.totalPages]);
  useEffect(() => {
    setJoinPage((current) => Math.min(current, joinSlice.totalPages));
  }, [joinSlice.totalPages]);
  useEffect(() => {
    setPaymentPage((current) => Math.min(current, paymentSlice.totalPages));
  }, [paymentSlice.totalPages]);

  if (!isLoggedIn) {
    return (
      <MainLayout hideFooterOnMobile={true}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access the admin dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <MainLayout hideFooterOnMobile={true}>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Admin access is required for this page.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideFooterOnMobile={true}>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        {/* ── Sidebar ── */}
        <aside className="hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low md:flex">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[1.6rem]">admin_panel_settings</span>
              </div>
              <div>
                <h2 className="font-headline text-sm font-black uppercase tracking-[0.1em] text-primary">
                  Admin <span className="text-secondary">Portal</span>
                </h2>
                <p className="text-[10px] font-bold text-on-surface-variant/60">BagPacker Control</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 pt-4">
            {[
              ["overview", "Dashboard", "grid_view"],
              ["moderation", "Moderation", "gavel"],
              ["operations", "Operations", "monitoring"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  activeTab === key
                    ? "bg-primary text-on-primary shadow-[0_8px_16px_rgba(1,45,29,0.15)]"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <span className="material-symbols-outlined text-[1.2rem]">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="mx-6 mb-8 rounded-2xl bg-surface-container-high/50 p-4 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary font-bold">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-on-surface">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-on-surface-variant">Administrator</p>
              </div>
            </div>
            <button
              onClick={() => {
                /* Logout handled by top nav usually */
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-highest py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition hover:bg-error-container hover:text-error"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Log Out
            </button>
          </div>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface/80 backdrop-blur-xl md:hidden">
          <nav className="flex items-center justify-around px-2 py-3">
            {[
              ["overview", "grid_view", "Admin"],
              ["moderation", "gavel", "Mod"],
              ["operations", "monitoring", "Ops"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative flex flex-col items-center gap-1 transition-all ${
                  activeTab === key ? "text-primary" : "text-on-surface-variant/40"
                }`}
              >
                <span className={`material-symbols-outlined text-[1.4rem] ${activeTab === key ? "font-bold" : ""}`}>
                  {icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto px-4 py-10 pb-24 md:px-12 md:pb-10">
          <div className="mx-auto max-w-6xl space-y-10">
            {/* Header Section */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-on-surface capitalize">
                  {activeTab} <span className="text-secondary">Terminal</span>
                </h1>
                <p className="mt-1 text-[11px] sm:text-sm text-on-surface-variant opacity-70">
                  Real-time platform oversight and administrative management.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 border border-outline-variant/30">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">System Live</span>
                </div>
                <button
                  onClick={loadAdminData}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-highest"
                  title="Refresh Data"
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
            {successMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-sm font-bold text-secondary">
                <span className="material-symbols-outlined">check_circle</span>
                {successMessage}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-outline-variant/20 bg-surface">
                <LoadingPanel label="Connecting to secure database..." variant="grid" />
              </div>
            ) : (
              <div className="space-y-10">
                {/* ── Dashboard Tab ── */}
                {activeTab === "overview" && (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
                      {stats.map(([label, value, icon]) => (
                        <article
                          key={label}
                          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/20 bg-surface p-4 sm:p-6 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                            <div>
                              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                                {label}
                              </p>
                              <p className="mt-2 sm:mt-3 font-headline text-lg sm:text-3xl font-black text-on-surface">
                                {typeof value === "number" ? value.toLocaleString() : value}
                              </p>
                            </div>
                            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/5 text-primary shrink-0">
                              <span className="material-symbols-outlined text-lg sm:text-[1.4rem]">{icon}</span>
                            </div>
                          </div>
                          <div className="mt-4 sm:mt-6 flex items-center gap-2 text-[8px] sm:text-[10px] font-bold text-secondary">
                            <span className="material-symbols-outlined text-[10px] sm:text-sm">trending_up</span>
                            <span>Growth</span>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
                      {/* Recent Activity / Payments */}
                      <section className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-headline text-lg font-black text-on-surface">
                            <span className="material-symbols-outlined text-primary">payments</span>
                            Recent Transactions
                          </h3>
                          <button onClick={() => { setActiveTab("operations"); setOperationsSection("payments"); }} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                            View All
                          </button>
                        </div>
                        <div className="space-y-3">
                          {paymentMonitor.items.slice(0, 5).map((item) => (
                            <div key={item._id} className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 transition hover:bg-surface-container">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
                                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-on-surface">{item.tripId?.title || "Unknown Trip"}</p>
                                  <p className="truncate text-[10px] text-on-surface-variant">{item.travelerId?.name} • {item.paymentStatus}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-headline text-sm font-black text-primary">INR {safeNumber(item.totalAmount)}</p>
                                <p className="text-[9px] font-bold uppercase text-on-surface-variant/50">{new Date(item.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Pending Queue */}
                      <section className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                          <h3 className="flex items-center gap-2 font-headline text-lg font-black text-on-surface">
                            <span className="material-symbols-outlined text-primary">assignment_late</span>
                            Action Queue
                          </h3>
                          <button onClick={() => setActiveTab("moderation")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                            Open Queue
                          </button>
                        </div>
                        <div className="space-y-3">
                          {pendingOrganizers.slice(0, 3).map((org) => (
                            <div key={org._id} className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
                                  <span className="material-symbols-outlined text-sm">business</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-on-surface">{org.businessName}</p>
                                  <p className="text-[10px] text-on-surface-variant">New Organizer Request</p>
                                </div>
                              </div>
                              <button onClick={() => { setActiveTab("moderation"); setModerationSection("organizers"); }} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase text-primary hover:bg-primary/20 transition">
                                Review
                              </button>
                            </div>
                          ))}
                          {pendingVerifications.slice(0, 2).map((v) => (
                            <div key={v._id} className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                                  <span className="material-symbols-outlined text-sm">shield_person</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-on-surface">{v.name}</p>
                                  <p className="text-[10px] text-on-surface-variant">Identity Document Check</p>
                                </div>
                              </div>
                              <button onClick={() => { setActiveTab("moderation"); setModerationSection("verifications"); }} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase text-primary hover:bg-primary/20 transition">
                                Review
                              </button>
                            </div>
                          ))}
                          {pendingOrganizers.length === 0 && pendingVerifications.length === 0 && (
                            <div className="py-10 text-center">
                              <span className="material-symbols-outlined text-4xl text-outline-variant">verified</span>
                              <p className="mt-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest">Everything Processed</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {/* ── Moderation Tab ── */}
                {activeTab === "moderation" && (
                  <div className="space-y-8">
                    {/* Sub-Tabs */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {[
                        ["users", "User Directory", "groups"],
                        ["organizers", "Organizers", "business_center"],
                        ["verifications", "ID Verification", "fact_check"],
                        ["reports", "Reports", "flag"],
                      ].map(([key, label, icon]) => (
                        <button
                          key={key}
                          onClick={() => setModerationSection(key)}
                          className={`flex items-center gap-2 rounded-2xl border px-3 py-3 sm:px-5 text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                            moderationSection === key
                              ? "border-primary bg-primary text-on-primary shadow-lg"
                              : "border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm sm:text-base">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Section: Users */}
                    {moderationSection === "users" && (
                      <section className="space-y-4">
                        <div className="hidden md:block rounded-3xl border border-outline-variant/20 bg-surface shadow-sm overflow-hidden">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-outline-variant/10">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">User Profile</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Level</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Access Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/5">
                              {users.map((u) => (
                                <tr key={u._id} className="group transition hover:bg-surface-container-lowest">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary font-black">
                                        {u.name?.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-on-surface">{u.name}</p>
                                        <p className="truncate text-[10px] text-on-surface-variant/60">{u.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                                      u.role === "admin" ? "bg-purple-500/10 text-purple-700" :
                                      u.role === "organizer" ? "bg-blue-500/10 text-blue-700" :
                                      "bg-slate-500/10 text-slate-700"
                                    }`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${u.isBanned ? "text-error" : "text-secondary"}`}>
                                      <span className={`h-2 w-2 rounded-full ${u.isBanned ? "bg-error" : "bg-secondary"}`} />
                                      {u.isBanned ? "Suspended" : "Active Access"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => handleToggleBan(u._id, u.isBanned)}
                                      className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition shadow-sm ${
                                        u.isBanned
                                          ? "bg-secondary text-on-secondary hover:shadow-md"
                                          : "bg-error/10 text-error hover:bg-error/20"
                                      }`}
                                    >
                                      {u.isBanned ? "Restore" : "Suspend"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="grid gap-3 md:hidden">
                          {users.map((u) => (
                            <article key={u._id} className="rounded-3xl border border-outline-variant/10 bg-surface p-5 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 flex shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-lg">
                                  {u.name?.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-headline text-base font-black text-on-surface">{u.name}</p>
                                  <p className="truncate text-[10px] font-bold text-on-surface-variant/60">{u.email}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-outline-variant/10 pt-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`w-fit rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
                                    u.role === "admin" ? "bg-purple-500/10 text-purple-700" :
                                    u.role === "organizer" ? "bg-blue-500/10 text-blue-700" :
                                    "bg-slate-500/10 text-slate-700"
                                  }`}>
                                    {u.role}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase ${u.isBanned ? "text-error" : "text-secondary"}`}>
                                    {u.isBanned ? "Suspended" : "Active"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleToggleBan(u._id, u.isBanned)}
                                  className={`rounded-xl px-6 py-2 text-[9px] font-black uppercase tracking-widest transition ${
                                    u.isBanned ? "bg-secondary text-on-secondary" : "bg-error-container text-error"
                                  }`}
                                >
                                  {u.isBanned ? "Restore" : "Suspend"}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4 bg-surface-container-low/50">
                          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                            Page {userPagination.page} of {userPagination.totalPages}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                              disabled={userPage === 1}
                              className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-on-surface-variant font-bold text-[10px] disabled:opacity-30"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setUserPage((p) => Math.min(userPagination.totalPages, p + 1))}
                              disabled={userPage >= userPagination.totalPages}
                              className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-on-surface-variant font-bold text-[10px] disabled:opacity-30"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Section: Organizers */}
                    {moderationSection === "organizers" && (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {pendingOrganizers.map((org) => (
                          <article key={org._id} className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                            <div className="flex gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                                <span className="material-symbols-outlined text-[2rem]">store</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="truncate text-lg font-black text-on-surface">{org.businessName}</h4>
                                <p className="text-xs text-on-surface-variant">{org.userId?.name}</p>
                                <p className="text-[10px] text-on-surface-variant/50">{org.userId?.email}</p>
                              </div>
                            </div>
                            <div className="mt-8 flex gap-3">
                              <button
                                onClick={() => updateOrganizerStatus(org._id, "approved")}
                                className="flex-1 rounded-2xl bg-primary py-3.5 text-xs font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateOrganizerStatus(org._id, "rejected")}
                                className="rounded-2xl border border-error/20 bg-error-container/20 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-error hover:bg-error-container/40 transition"
                              >
                                Reject
                              </button>
                            </div>
                          </article>
                        ))}
                        {pendingOrganizers.length === 0 && (
                          <div className="col-span-full py-20 text-center rounded-3xl border border-dashed border-outline-variant/40">
                            <span className="material-symbols-outlined text-5xl text-outline-variant">inventory_2</span>
                            <p className="mt-4 text-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">No Pending Approvals</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section: Verifications */}
                    {moderationSection === "verifications" && (
                      <div className="grid gap-6 lg:grid-cols-2">
                        {pendingVerifications.map((v) => (
                          <article key={v._id} className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <h4 className="truncate text-lg font-black text-on-surface">{v.name}</h4>
                                <p className="text-xs text-on-surface-variant">{v.email}</p>
                              </div>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-[9px] font-black uppercase text-blue-700">Identity Audit</span>
                            </div>

                            <div className="mt-6 overflow-hidden rounded-2xl bg-surface-container border border-outline-variant/10">
                              {v.governmentIdUrl ? (
                                <div className="relative group aspect-video">
                                  <img
                                    src={resolveMediaUrl(v.governmentIdUrl)}
                                    alt="User ID"
                                    className="h-full w-full object-cover transition duration-500 blur-sm group-hover:blur-0"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-on-surface/40 opacity-100 transition group-hover:opacity-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Click to inspect document</p>
                                  </div>
                                  <a
                                    href={resolveMediaUrl(v.governmentIdUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-4 right-4 rounded-xl bg-surface/90 p-2 text-primary shadow-xl hover:bg-white"
                                  >
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                  </a>
                                </div>
                              ) : (
                                <div className="flex h-48 items-center justify-center">
                                  <p className="text-xs font-bold text-on-surface-variant/40 italic">No document image provided</p>
                                </div>
                              )}
                            </div>

                            <div className="mt-6 flex gap-3">
                              <button
                                onClick={() => updateVerificationStatus(v._id, "verified")}
                                className="flex-1 rounded-2xl bg-secondary py-3.5 text-xs font-black uppercase tracking-widest text-on-secondary shadow-lg transition hover:scale-[1.02]"
                              >
                                Confirm Verification
                              </button>
                              <button
                                onClick={() => updateVerificationStatus(v._id, "rejected")}
                                className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-6 py-3.5 text-xs font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-high transition"
                              >
                                Reject
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Operations Tab ── */}
                {activeTab === "operations" && (
                  <div className="space-y-8">
                    {/* Secondary Navigation */}
                    <div className="flex overflow-x-auto border-b border-outline-variant/10 no-scrollbar">
                      {[
                        ["trips", "Lifecycle Monitor", "rocket_launch"],
                        ["join", "Community Activity", "hub"],
                        ["payments", "Payment Ledger", "account_balance"],
                      ].map(([key, label, icon]) => (
                        <button
                          key={key}
                          onClick={() => setOperationsSection(key)}
                          className={`flex shrink-0 items-center gap-2.5 px-4 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                            operationsSection === key
                              ? "text-primary border-b-4 border-primary"
                              : "text-on-surface-variant/60 hover:text-primary"
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{icon}</span>
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Section: Trip Lifecycle */}
                    {operationsSection === "trips" && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface-container-low/50 p-6 border border-outline-variant/10">
                          <div className="relative flex-1 min-w-[240px]">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">search</span>
                            <input
                              type="text"
                              value={operationsSearch}
                              onChange={(e) => setOperationsSearch(e.target.value)}
                              placeholder="Search by trip code, title, or destination..."
                              className="w-full rounded-2xl bg-surface py-3 pl-12 pr-6 text-sm text-on-surface outline-none border border-outline-variant/20 focus:border-primary/40 shadow-sm transition"
                            />
                          </div>
                          <select
                            value={tripStatusFilter}
                            onChange={(e) => setTripStatusFilter(e.target.value)}
                            className="rounded-2xl bg-surface px-5 py-3 text-xs font-black uppercase text-on-surface-variant outline-none border border-outline-variant/20 shadow-sm"
                          >
                            <option value="all">Every State</option>
                            {tripStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          {tripSlice.items.map((trip) => (
                            <article key={trip._id} className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm transition hover:shadow-md">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <h4 className="truncate text-lg font-black text-on-surface">{trip.title}</h4>
                                  <p className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
                                    <span className="material-symbols-outlined text-sm text-primary">route</span>
                                    {trip.source} → {trip.destination}
                                  </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                  trip.status === "active" ? "bg-green-100 text-green-700" :
                                  trip.status === "completed" ? "bg-blue-100 text-blue-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {trip.status}
                                </span>
                              </div>

                              <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="rounded-2xl bg-surface-container-low p-4">
                                  <p className="text-[10px] font-black uppercase text-on-surface-variant/40">Organizer</p>
                                  <p className="mt-1 truncate text-xs font-bold text-on-surface">{trip.organizerId?.businessName}</p>
                                </div>
                                <div className="rounded-2xl bg-surface-container-low p-4">
                                  <p className="text-[10px] font-black uppercase text-on-surface-variant/40">Status</p>
                                  <p className="mt-1 text-xs font-bold text-on-surface">{trip.startedAt ? "Live Session" : "Awaiting Start"}</p>
                                </div>
                              </div>

                              <div className="mt-8 flex gap-2">
                                <button
                                  onClick={() => updateTripLifecycle(trip._id, "start")}
                                  disabled={trip.status !== "active" || trip.startedAt}
                                  className="flex-1 rounded-xl bg-primary py-3 text-[10px] font-black uppercase tracking-widest text-on-primary transition hover:opacity-90 disabled:opacity-30"
                                >
                                  Deploy Start
                                </button>
                                <button
                                  onClick={() => updateTripLifecycle(trip._id, "complete")}
                                  disabled={trip.status === "completed"}
                                  className="flex-1 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface transition hover:bg-surface-container-high disabled:opacity-30"
                                >
                                  Complete
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section: Payments Ledger */}
                    {operationsSection === "payments" && (
                      <section className="space-y-4">
                        <div className="hidden md:block rounded-3xl border border-outline-variant/20 bg-surface shadow-sm overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-surface-container-low/50">
                                <tr>
                                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Client</th>
                                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Service Item</th>
                                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 text-right">Value</th>
                                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Ledger Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/5">
                                {paymentSlice.items.map((p) => (
                                  <tr key={p._id} className="transition hover:bg-surface-container-lowest">
                                    <td className="px-6 py-5">
                                      <p className="text-sm font-bold text-on-surface">{p.travelerId?.name}</p>
                                      <p className="text-[10px] text-on-surface-variant/60 uppercase">{p.travelerId?.email}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                      <p className="text-sm font-bold text-on-surface-variant">{p.tripId?.title}</p>
                                      <p className="text-[10px] text-on-surface-variant/40">{p.tripId?.source} → {p.tripId?.destination}</p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                      <p className="font-headline text-sm font-black text-primary">INR {safeNumber(p.totalAmount)}</p>
                                      <p className="text-[10px] font-black text-on-surface-variant/30 uppercase">{p.currency}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                                        p.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                                        p.paymentStatus === "failed" ? "bg-red-100 text-red-700" :
                                        "bg-orange-100 text-orange-700"
                                      }`}>
                                        {p.paymentStatus}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mobile Payment Cards */}
                        <div className="grid gap-4 md:hidden">
                          {paymentSlice.items.map((p) => (
                            <article key={p._id} className="rounded-3xl border border-outline-variant/10 bg-surface p-5 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                                  p.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                                  p.paymentStatus === "failed" ? "bg-red-100 text-red-700" :
                                  "bg-orange-100 text-orange-700"
                                }`}>
                                  {p.paymentStatus}
                                </span>
                                <p className="font-headline text-sm font-black text-primary">INR {safeNumber(p.totalAmount)}</p>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40">Client</p>
                                  <p className="text-xs font-bold text-on-surface">{p.travelerId?.name}</p>
                                  <p className="text-[9px] text-on-surface-variant/60">{p.travelerId?.email}</p>
                                </div>
                                <div className="pt-3 border-t border-outline-variant/5">
                                  <p className="text-[8px] font-black uppercase text-on-surface-variant/40">Service</p>
                                  <p className="text-xs font-bold text-on-surface-variant">{p.tripId?.title}</p>
                                  <p className="text-[9px] text-on-surface-variant/40">{p.tripId?.source} → {p.tripId?.destination}</p>
                                </div>
                              </div>
                            </article>
                          ))}
                          {paymentSlice.items.length === 0 && (
                            <div className="py-20 text-center rounded-3xl bg-surface-container-low/30 border border-dashed border-outline-variant/20">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">No payment records</p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
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
