import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api, resolveMediaUrl } from "../lib/api";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../lib/alerts";
import {
  clearAuth,
  getDashboardPath,
  getStoredUser,
  isAuthenticated,
  updateStoredUser,
} from "../lib/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [idFile, setIdFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const storedUser = getStoredUser();

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated()) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const userProfile = await api.get("/users/profile");
        setProfile(userProfile);
        setForm({
          name: userProfile.name || "",
          phone: userProfile.phone || "",
        });

        const userReviews = await api.get(`/reviews/${userProfile._id}`);
        setReviews(Array.isArray(userReviews) ? userReviews : []);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const verificationTone = useMemo(() => {
    if (profile?.verificationStatus === "verified") {
      return "bg-[#d8f5e5] text-[#0f5132]";
    }
    if (profile?.verificationStatus === "rejected") {
      return "bg-[#ffd7d7] text-[#8a1f1f]";
    }
    return "bg-[#ffe9cd] text-[#9b5600]";
  }, [profile?.verificationStatus]);

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      const updatedProfile = await api.put("/users/profile", form);
      setProfile(updatedProfile);
      updateStoredUser(updatedProfile);
      setSuccessMessage("Profile updated successfully.");
      await showSuccessAlert("Profile updated", "Your account details were saved.");
    } catch (saveError) {
      setError(saveError.message);
      await showErrorAlert("Could not save profile", saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const uploadGovernmentId = async () => {
    if (!idFile) {
      setError("Please choose a file to upload.");
      await showErrorAlert("No file selected", "Please choose a government ID file first.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("governmentId", idFile);

      const response = await api.post("/users/upload-id", formData);
      setProfile(response.user);
      updateStoredUser(response.user);
      setSuccessMessage("Government ID uploaded successfully.");
      setIdFile(null);
      await showSuccessAlert("ID uploaded", "Your verification document is now pending review.");
    } catch (uploadError) {
      setError(uploadError.message);
      await showErrorAlert("Upload failed", uploadError.message);
    } finally {
      setIsUploading(false);
    }
  };

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

  if (!isAuthenticated()) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to view your profile.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
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

        <div className="overflow-hidden rounded-3xl bg-linear-to-r from-primary to-primary-container p-8 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-container">
            Live Profile
          </p>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-headline text-5xl font-extrabold">
                {profile?.name || storedUser?.name || "BagPacker User"}
              </h1>
              <p className="mt-2 text-white/80">
                {profile?.email || storedUser?.email}
              </p>
              <p className="mt-1 text-sm uppercase tracking-[0.14em] text-secondary-container">
                {profile?.role || storedUser?.role || "traveler"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={getDashboardPath(profile?.role || storedUser?.role)}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur-sm"
              >
                Go To Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-[#b94a57] px-5 py-3 text-sm font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingPanel label="Loading profile..." />
        ) : null}

        {!isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-6">
              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-headline text-3xl font-bold text-primary">
                    Account Details
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${verificationTone}`}>
                    {profile?.verificationStatus || "pending"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                      Full Name
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="rounded-xl bg-surface-container-low px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                      Phone
                    </span>
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className="rounded-xl bg-surface-container-low px-4 py-3"
                    />
                  </label>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </article>

              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <h3 className="font-headline text-3xl font-bold text-primary">
                  Reviews Received
                </h3>
                <div className="mt-5 space-y-4">
                  {reviews.length ? (
                    reviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-2xl bg-surface-container-low p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-primary">
                            {review.reviewerId?.name || "Traveler"}
                          </p>
                          <p className="text-sm font-bold text-secondary">
                            {review.rating}/5
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-on-surface-variant">
                          {review.comment || "No comment shared."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-6 text-center text-on-surface-variant">
                      No reviews yet.
                    </div>
                  )}
                </div>
              </article>
            </section>

            <aside className="space-y-6">
              <article className="rounded-3xl bg-primary-container p-6 text-white shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-primary-container">
                  Trust Score
                </p>
                <p className="mt-2 font-headline text-6xl font-black">
                  {profile?.trustScore ?? storedUser?.trustScore ?? 0}
                </p>
                <p className="mt-3 text-sm text-on-primary-container">
                  Calculated from reviews received on completed bookings.
                </p>
              </article>

              <article className="rounded-3xl bg-surface-container-lowest p-6 shadow-lg">
                <h3 className="font-headline text-3xl font-bold text-primary">
                  Government ID
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Upload jpg, jpeg, png, or pdf files up to 5MB for verification.
                </p>

                <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(event) => setIdFile(event.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                  <button
                    onClick={uploadGovernmentId}
                    disabled={isUploading}
                    className="mt-4 rounded-xl bg-secondary px-5 py-3 font-bold text-[#2d2000] disabled:opacity-60"
                  >
                    {isUploading ? "Uploading..." : "Upload ID"}
                  </button>
                </div>

                {profile?.governmentIdUrl ? (
                  <a
                    href={resolveMediaUrl(profile.governmentIdUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-sm font-bold text-secondary underline"
                  >
                    View uploaded document
                  </a>
                ) : null}
              </article>
            </aside>
          </div>
        ) : null}
      </section>
    </MainLayout>
  );
}
