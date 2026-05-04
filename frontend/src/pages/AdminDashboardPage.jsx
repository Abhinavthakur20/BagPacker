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
      <MainLayout>
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
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Admin access is required for this page.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        <aside className="hidden w-72 flex-col border-r border-outline-variant/20 bg-surface-container-low md:flex">
          <div className="p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {user?.name?.charAt(0) || "A"}
            </div>
            <h2 className="mt-4 font-manrope text-xl font-extrabold text-primary">
              {user?.name || "Admin"}
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-outline">Admin</p>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {[
              ["overview", "Overview", "grid_view"],
              ["moderation", "Moderation", "gavel"],
              ["operations", "Operations", "monitoring"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === key
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="grid grid-cols-3 border-t border-outline-variant/20 py-6 text-center">
            <div>
              <p className="text-lg font-extrabold text-primary">{userPagination.total}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Users</p>
            </div>
            <div className="border-x border-outline-variant/20">
              <p className="text-lg font-extrabold text-primary">{pendingOrganizers.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Pending</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-primary">
                {reports.filter((item) => item.status !== "resolved").length}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-outline">Reports</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-12">
          {error ? (
            <div className="mb-6 rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
              {error}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mb-6 rounded-2xl bg-[#012d1d] p-4 font-semibold text-[#7fa11c]">
              {successMessage}
            </div>
          ) : null}

          {isLoading ? (
            <LoadingPanel label="Loading admin dashboard..." variant="grid" />
          ) : (
            <div className="max-w-5xl space-y-10">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-6">
                <h1 className="font-manrope text-2xl font-extrabold capitalize tracking-tight text-primary">
                  {activeTab}
                </h1>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                  Live
                </span>
              </div>

              {activeTab === "overview" ? (
                <section className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map(([label, value, icon]) => (
                      <article key={label} className="rounded-2xl bg-surface-container-low p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                              {label}
                            </p>
                            <p className="mt-2 font-manrope text-2xl font-black text-primary">{value}</p>
                          </div>
                          <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary">
                            {icon}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Payment summary
                      </h3>
                      <div className="mt-4 space-y-3">
                        {paymentMonitor.items.slice(0, 6).map((item) => (
                          <div key={item._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-bold text-primary">
                              {item.tripId?.title || "Trip"} • {item.travelerId?.name || "Traveler"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {item.paymentStatus} • {item.status} • INR {safeNumber(item.totalAmount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Reviews snapshot
                      </h3>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Avg rating: {Number(reviewsOverview.summary?.averageRating || 0).toFixed(2)} • Total:{" "}
                        {reviewsOverview.summary?.totalReviews || 0}
                      </p>
                      <div className="mt-4 space-y-3">
                        {reviewsOverview.items.slice(0, 6).map((review) => (
                          <div key={review._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-bold text-primary">
                              {review.reviewerId?.name || "Traveler"} → {review.revieweeId?.name || "Organizer"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {review.rating}/5 • {review.bookingId?.tripId?.title || "Trip"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                </section>
              ) : null}

              {activeTab === "moderation" ? (
                <section className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["users", "User directory", userPagination.total],
                      ["organizers", "Organizer approvals", organizerSlice.total],
                      ["verifications", "Verification requests", verificationSlice.total],
                      ["reports", "Reports", reportSlice.total],
                    ].map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setModerationSection(key)}
                        className={`rounded-xl border p-4 text-left transition ${
                          moderationSection === key
                            ? "border-primary bg-primary/10"
                            : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
                        <p className="mt-2 text-2xl font-black text-primary">{count}</p>
                      </button>
                    ))}
                  </div>

                  {moderationSection === "users" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                          User directory
                        </h3>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold uppercase text-outline">Per page</label>
                          <select
                            value={userLimit}
                            onChange={(event) => {
                              const nextLimit = Number(event.target.value || 50);
                              setUserLimit(nextLimit);
                              setUserPage(1);
                            }}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Showing page {userPagination.page} of {userPagination.totalPages} • {userPagination.total} users total
                      </p>
                      <div className="mt-4 space-y-2">
                        {users.map((account) => (
                          <div key={account._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-bold text-primary">
                              {account.name || "Unknown"} • {account.role || "traveler"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {account.email || "N/A"} • {account.phone || "N/A"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setUserPage((current) => Math.max(1, current - 1))}
                          disabled={userPagination.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {userPagination.page}/{userPagination.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setUserPage((current) => Math.min(userPagination.totalPages, current + 1))
                          }
                          disabled={userPagination.page >= userPagination.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}

                  {moderationSection === "organizers" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Pending organizer approvals
                      </h3>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {organizerSlice.page} of {organizerSlice.totalPages} • {organizerSlice.total} requests
                      </p>
                      <div className="mt-4 space-y-3">
                        {organizerSlice.items.map((organizer) => (
                          <div key={organizer._id} className="rounded-xl bg-surface p-3">
                            <p className="font-bold text-primary">{organizer.businessName}</p>
                            <p className="text-xs text-on-surface-variant">
                              {organizer.userId?.name || "N/A"} • {organizer.userId?.email || "N/A"}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => updateOrganizerStatus(organizer._id, "approved")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Approve</button>
                              <button onClick={() => updateOrganizerStatus(organizer._id, "rejected")} className="rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-on-error-container">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setOrganizerPage((current) => Math.max(1, current - 1))}
                          disabled={organizerSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {organizerSlice.page}/{organizerSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setOrganizerPage((current) =>
                              Math.min(organizerSlice.totalPages, current + 1),
                            )
                          }
                          disabled={organizerSlice.page >= organizerSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}

                  {moderationSection === "verifications" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Pending user verifications
                      </h3>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {verificationSlice.page} of {verificationSlice.totalPages} • {verificationSlice.total} requests
                      </p>
                      <div className="mt-4 space-y-3">
                        {verificationSlice.items.map((verification) => (
                          <div key={verification._id} className="rounded-xl bg-surface p-3">
                            <p className="font-bold text-primary">{verification.name}</p>
                            <p className="text-xs text-on-surface-variant">{verification.email}</p>
                            {verification.governmentIdUrl ? (
                              <a href={resolveMediaUrl(verification.governmentIdUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-secondary underline">
                                View document
                              </a>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => updateVerificationStatus(verification._id, "verified")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Verify</button>
                              <button onClick={() => updateVerificationStatus(verification._id, "rejected")} className="rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-on-error-container">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setVerificationPage((current) => Math.max(1, current - 1))}
                          disabled={verificationSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {verificationSlice.page}/{verificationSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setVerificationPage((current) =>
                              Math.min(verificationSlice.totalPages, current + 1),
                            )
                          }
                          disabled={verificationSlice.page >= verificationSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}

                  {moderationSection === "reports" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                        Reports
                      </h3>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {reportSlice.page} of {reportSlice.totalPages} • {reportSlice.total} reports
                      </p>
                      <div className="mt-4 space-y-3">
                        {reportSlice.items.map((report) => (
                          <div key={report._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-bold text-primary">
                              {report.reportedBy?.name || "Unknown"} reported {report.reportedUserId?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-on-surface-variant">{report.reason}</p>
                            {report.status !== "resolved" ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {["warning", "suspension", "ban", "dismissed"].map((action) => (
                                  <button key={action} onClick={() => resolveReport(report._id, action)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase text-white">
                                    {action}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs font-bold uppercase text-[#7fa11c]">
                                {report.adminAction || "resolved"}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setReportPage((current) => Math.max(1, current - 1))}
                          disabled={reportSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {reportSlice.page}/{reportSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setReportPage((current) => Math.min(reportSlice.totalPages, current + 1))
                          }
                          disabled={reportSlice.page >= reportSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}
                </section>
              ) : null}

              {activeTab === "operations" ? (
                <section className="space-y-6">
                  <article className="rounded-2xl bg-surface-container-low p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={operationsSearch}
                        onChange={(event) => setOperationsSearch(event.target.value)}
                        placeholder="Search trips, users, routes..."
                        className="min-w-[220px] flex-1 rounded-lg bg-surface px-3 py-2 text-sm text-primary outline-none"
                      />
                      <input
                        type="date"
                        value={operationsFrom}
                        onChange={(event) => setOperationsFrom(event.target.value)}
                        className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                      />
                      <input
                        type="date"
                        value={operationsTo}
                        onChange={(event) => setOperationsTo(event.target.value)}
                        className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOperationsSearch("");
                          setOperationsFrom("");
                          setOperationsTo("");
                          setTripStatusFilter("all");
                          setTripPaymentFilter("all");
                          setJoinStatusFilter("all");
                          setPaymentStatusFilter("all");
                        }}
                        className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                      >
                        Reset
                      </button>
                    </div>
                  </article>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["trips", "Trip listings monitor", filteredTrips.length],
                      ["join", "Join activity", filteredJoinRequests.length],
                      ["payments", "Payment monitor", filteredPayments.length],
                    ].map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setOperationsSection(key)}
                        className={`rounded-xl border p-4 text-left transition ${
                          operationsSection === key
                            ? "border-primary bg-primary/10"
                            : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
                        <p className="mt-2 text-2xl font-black text-primary">{count}</p>
                      </button>
                    ))}
                  </div>

                  {opsLoading ? (
                    <LoadingPanel label="Loading operations..." variant="list" />
                  ) : null}

                  {operationsSection === "trips" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                          Trip listings monitor
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={tripStatusFilter}
                            onChange={(event) => setTripStatusFilter(event.target.value)}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value="all">All statuses</option>
                            {tripStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <select
                            value={tripPaymentFilter}
                            onChange={(event) => setTripPaymentFilter(event.target.value)}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value="all">All payments</option>
                            <option value="enabled">Payment enabled</option>
                            <option value="disabled">Payment disabled</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              exportRows(
                                "trip-listings.csv",
                                ["Trip", "Route", "Status", "Payment", "Started", "Created"],
                                filteredTrips.map((trip) => [
                                  trip?.title || "",
                                  `${trip?.source || ""} to ${trip?.destination || ""}`,
                                  trip?.status || "",
                                  trip?.paymentEnabled === false ? "disabled" : "enabled",
                                  trip?.startedAt || "",
                                  trip?.createdAt || "",
                                ]),
                              )
                            }
                            className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                          >
                            Export CSV
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {tripSlice.page} of {tripSlice.totalPages} • {tripSlice.total} trips
                      </p>
                      <div className="mt-4 space-y-3">
                        {tripSlice.items.map((trip) => (
                          <div key={trip._id} className="rounded-xl bg-surface p-3">
                            <p className="font-bold text-primary">{trip.title}</p>
                            <p className="text-xs text-on-surface-variant">
                              {trip.source} to {trip.destination} • {trip.transportType || "bus"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {trip.status} • payments {trip.paymentEnabled === false ? "off" : "on"} • {trip.startedAt ? "started" : "not started"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button onClick={() => updateTripLifecycle(trip._id, "start")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Start</button>
                              <button onClick={() => updateTripLifecycle(trip._id, "complete")} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Complete</button>
                              <button onClick={() => updateTripLifecycle(trip._id, "cancel")} className="rounded-lg bg-error-container px-3 py-2 text-xs font-bold text-on-error-container">Cancel</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setTripPage((current) => Math.max(1, current - 1))}
                          disabled={tripSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {tripSlice.page}/{tripSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTripPage((current) => Math.min(tripSlice.totalPages, current + 1))}
                          disabled={tripSlice.page >= tripSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}

                  {operationsSection === "join" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                          Join activity
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={joinStatusFilter}
                            onChange={(event) => setJoinStatusFilter(event.target.value)}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value="all">All statuses</option>
                            {joinStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              exportRows(
                                "join-activity.csv",
                                ["Requester", "Receiver", "Route", "Status", "Created"],
                                filteredJoinRequests.map((request) => [
                                  request?.requesterId?.name || "",
                                  request?.receiverId?.name || "",
                                  `${request?.source || ""} to ${request?.destination || ""}`,
                                  request?.status || "",
                                  request?.createdAt || "",
                                ]),
                              )
                            }
                            className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                          >
                            Export CSV
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase">
                        {Object.entries(joinActivity.bookingStatusSummary || {}).map(([status, count]) => (
                          <span key={status} className="rounded-full bg-surface px-3 py-1 text-primary">
                            {status}: {count}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {joinSlice.page} of {joinSlice.totalPages} • {joinSlice.total} requests
                      </p>
                      <div className="mt-4 space-y-2">
                        {joinSlice.items.map((request) => (
                          <div key={request._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-semibold text-primary">
                              {request.requesterId?.name || "Traveler"} to {request.receiverId?.name || "Traveler"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {request.source} to {request.destination} • {request.status}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setJoinPage((current) => Math.max(1, current - 1))}
                          disabled={joinSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {joinSlice.page}/{joinSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setJoinPage((current) => Math.min(joinSlice.totalPages, current + 1))}
                          disabled={joinSlice.page >= joinSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}

                  {operationsSection === "payments" ? (
                    <article className="rounded-2xl bg-surface-container-low p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-outline">
                          Payment monitor
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={paymentStatusFilter}
                            onChange={(event) => setPaymentStatusFilter(event.target.value)}
                            className="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-primary"
                          >
                            <option value="all">All payment statuses</option>
                            {paymentStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              exportRows(
                                "payments.csv",
                                ["Trip", "Traveler", "Payment Status", "Booking Status", "Amount", "Currency", "Created"],
                                filteredPayments.map((item) => [
                                  item?.tripId?.title || "",
                                  item?.travelerId?.name || "",
                                  item?.paymentStatus || "",
                                  item?.status || "",
                                  safeNumber(item?.totalAmount),
                                  item?.currency || "",
                                  item?.createdAt || "",
                                ]),
                              )
                            }
                            className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary"
                          >
                            Export CSV
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Showing page {paymentSlice.page} of {paymentSlice.totalPages} • {paymentSlice.total} payments
                      </p>
                      <div className="mt-4 space-y-2">
                        {paymentSlice.items.map((item) => (
                          <div key={item._id} className="rounded-xl bg-surface p-3">
                            <p className="text-sm font-bold text-primary">
                              {item.tripId?.title || "Trip"} • {item.travelerId?.name || "Traveler"}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {item.paymentStatus} • {item.status} • {safeNumber(item.totalAmount)} {item.currency}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setPaymentPage((current) => Math.max(1, current - 1))}
                          disabled={paymentSlice.page <= 1}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-outline">
                          Page {paymentSlice.page}/{paymentSlice.totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPaymentPage((current) => Math.min(paymentSlice.totalPages, current + 1))
                          }
                          disabled={paymentSlice.page >= paymentSlice.totalPages}
                          className="rounded-lg bg-surface px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </article>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </MainLayout>
  );
}
