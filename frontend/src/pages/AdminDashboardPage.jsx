import { useEffect, useMemo, useState } from "react";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../lib/alerts";
import { getStoredUser, isAuthenticated } from "../lib/auth";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [pendingOrganizers, setPendingOrganizers] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const user = getStoredUser();

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [allUsers, organizers, verifications, userReports] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/organizers/pending"),
        api.get("/admin/verifications/pending"),
        api.get("/admin/reports"),
      ]);

      setUsers(Array.isArray(allUsers) ? allUsers : []);
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
    if (!isAuthenticated()) {
      return;
    }

    loadAdminData();
  }, []);

  const metrics = useMemo(
    () => [
      ["Platform Users", users.length],
      ["Pending Organizers", pendingOrganizers.length],
      ["Pending Verifications", pendingVerifications.length],
      ["Open Reports", reports.filter((report) => report.status !== "resolved").length],
    ],
    [users, pendingOrganizers, pendingVerifications, reports],
  );

  const updateOrganizerStatus = async (id, approvalStatus) => {
    const result = await showConfirmAlert({
      title: `${approvalStatus === "approved" ? "Approve" : "Reject"} organizer?`,
      text: "This will update the organizer status and send a notification.",
      confirmButtonText: approvalStatus === "approved" ? "Approve" : "Reject",
      icon: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
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
      text: "This action will update the user's verification status.",
      confirmButtonText: verificationStatus === "verified" ? "Verify" : "Reject",
      icon: "warning",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
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

    if (!result.isConfirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      await api.put(`/admin/reports/${id}/resolve`, { adminAction });
      setSuccessMessage(`Report resolved with action: ${adminAction}.`);
      await showSuccessAlert("Report resolved", `Action applied: ${adminAction}.`);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Action failed", requestError.message);
    }
  };

  if (!isAuthenticated()) {
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
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            Admin Portal
          </p>
          <h1 className="font-headline text-4xl font-extrabold text-primary">
            Platform Moderation Dashboard
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Review organizer onboarding, KYC submissions, and user reports in one place.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl bg-[#d8f5e5] p-4 font-semibold text-[#0f5132]">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <LoadingPanel label="Loading admin data..." />
        ) : null}

        {!isLoading ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([label, value], index) => (
                <article
                  key={label}
                  className={`rounded-2xl p-5 shadow-sm ${
                    index === 2 ? "bg-primary text-white" : "bg-surface-container-lowest"
                  }`}
                >
                  <p className={`text-sm ${index === 2 ? "text-white/80" : "text-outline"}`}>
                    {label}
                  </p>
                  <p className="mt-2 font-headline text-5xl font-extrabold">
                    {value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Pending Organizer Approvals
                </h2>
                <div className="mt-5 space-y-4">
                  {pendingOrganizers.length ? (
                    pendingOrganizers.map((organizer) => (
                      <div
                        key={organizer._id}
                        className="rounded-2xl bg-surface-container-low p-4"
                      >
                        <p className="font-bold text-primary">{organizer.businessName}</p>
                        <p className="text-sm text-on-surface-variant">
                          Owner: {organizer.userId?.name || "N/A"}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          Email: {organizer.userId?.email || "N/A"}
                        </p>
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => updateOrganizerStatus(organizer._id, "approved")}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateOrganizerStatus(organizer._id, "rejected")}
                            className="rounded-xl bg-error-container px-4 py-2 text-sm font-bold text-on-error-container"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-6 text-center text-on-surface-variant">
                      No pending organizers.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Pending User Verifications
                </h2>
                <div className="mt-5 space-y-4">
                  {pendingVerifications.length ? (
                    pendingVerifications.map((verification) => (
                      <div
                        key={verification._id}
                        className="rounded-2xl bg-surface-container-low p-4"
                      >
                        <p className="font-bold text-primary">{verification.name}</p>
                        <p className="text-sm text-on-surface-variant">{verification.email}</p>
                        {verification.governmentIdUrl ? (
                          <a
                            href={verification.governmentIdUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-sm font-bold text-secondary underline"
                          >
                            View document
                          </a>
                        ) : null}
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => updateVerificationStatus(verification._id, "verified")}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => updateVerificationStatus(verification._id, "rejected")}
                            className="rounded-xl bg-error-container px-4 py-2 text-sm font-bold text-on-error-container"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-6 text-center text-on-surface-variant">
                      No pending verifications.
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
              <h2 className="font-headline text-3xl font-extrabold text-primary">
                User Reports
              </h2>
              <div className="mt-5 space-y-4">
                {reports.length ? (
                  reports.map((report) => (
                    <div
                      key={report._id}
                      className="rounded-2xl bg-surface-container-low p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-bold text-primary">
                            {report.reportedBy?.name || "Unknown"} reported{" "}
                            {report.reportedUserId?.name || "Unknown"}
                          </p>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {report.reason}
                          </p>
                          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                            {report.status}
                          </p>
                        </div>

                        {report.status !== "resolved" ? (
                          <div className="flex flex-wrap gap-2">
                            {["warning", "suspension", "ban", "dismissed"].map((action) => (
                              <button
                                key={action}
                                onClick={() => resolveReport(report._id, action)}
                                className="rounded-xl bg-primary px-3 py-2 text-xs font-bold uppercase text-white"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="rounded-full bg-[#d8f5e5] px-3 py-1 text-xs font-bold uppercase text-[#0f5132]">
                            {report.adminAction || "resolved"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-surface-container-low p-6 text-center text-on-surface-variant">
                    No reports found.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
