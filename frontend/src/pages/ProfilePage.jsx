import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api, resolveMediaUrl } from "../lib/api";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../lib/alerts";
import { getDashboardPath } from "../lib/auth";
import { logout as logoutAction, setUser } from "../store/authSlice";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const storedUser = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!isLoggedIn) {
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

        const userReviews = await api.get(`/reviews/${userProfile._id}?page=1&limit=20`);
        setReviews(
          Array.isArray(userReviews?.items)
            ? userReviews.items
            : Array.isArray(userReviews)
              ? userReviews
              : [],
        );
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isLoggedIn]);

  const verificationTone = useMemo(() => {
    if (profile?.verificationStatus === "verified") {
      return "bg-[#012d1d] text-[#7fa11c]";
    }
    if (profile?.verificationStatus === "rejected") {
      return "bg-error-container text-error";
    }
    if (profile?.verificationStatus === "pending") {
      return "bg-[#3d4466] text-[#7fa11c]";
    }
    return "bg-[#e4e4e4] text-[#555]";
  }, [profile?.verificationStatus]);

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      const updatedProfile = await api.put("/users/profile", form);
      setProfile(updatedProfile);
      dispatch(setUser(updatedProfile));
      setSuccessMessage("Profile updated successfully.");
      await showSuccessAlert("Profile updated", "Your account details were saved.");
    } catch (saveError) {
      setError(saveError.message);
      await showErrorAlert("Could not save profile", saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.post("/users/upload-avatar", formData);
      setProfile(response.user);
      dispatch(setUser(response.user));
      setSuccessMessage("Profile photo updated successfully.");
      await showSuccessAlert("Photo updated", "Your profile photo has been refreshed.");
    } catch (uploadError) {
      setError(uploadError.message);
      await showErrorAlert("Upload failed", uploadError.message);
    } finally {
      setIsUploading(false);
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
      dispatch(setUser(response.user));
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

    dispatch(logoutAction());
    await showSuccessAlert("Logged out", "Your session has been cleared.");
    navigate("/");
  };

  if (!isLoggedIn) {
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
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-10">
        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl bg-[#012d1d] p-4 font-semibold text-[#7fa11c]">
            {successMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl bg-linear-to-r from-[#012d1d] to-[#3d4466] p-5 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7fa11c]">
            Live Profile
          </p>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative group h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[#7fa11c]/30 bg-[#3d4466]">
                {profile?.avatarUrl || storedUser?.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(profile?.avatarUrl || storedUser?.avatarUrl)}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-[#7fa11c]">
                    {(profile?.name || storedUser?.name || "B")[0].toUpperCase()}
                  </div>
                )}
                
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">Change</span>
                </label>
              </div>

              <div>
                <h1 className="break-words font-manrope text-xl font-extrabold sm:text-3xl">
                  {profile?.name || storedUser?.name || "BagPacker User"}
                </h1>
                <p className="mt-2 text-white/80">
                  {profile?.email || storedUser?.email}
                </p>
                <p className="mt-1 text-sm uppercase tracking-[0.14em] text-[#7fa11c]">
                  {profile?.role || storedUser?.role || "traveler"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={getDashboardPath(profile?.role || storedUser?.role)}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur-sm"
              >
                Go To Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-[#b94a57] px-4 py-3 text-sm font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {isLoading ? <LoadingPanel label="Loading profile..." variant="page" /> : null}

        {!isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-6">
              <article className="rounded-xl bg-surface-container-lowest p-6 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-manrope text-xl font-bold text-primary">
                    Account Details
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${verificationTone}`}>
                    {profile?.verificationStatus || "unverified"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-outline">
                      Full Name
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="rounded-xl bg-surface-container-low px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                      className="rounded-xl bg-surface-container-low px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

              <article className="rounded-xl bg-surface-container-lowest p-6 shadow-lg">
                <h3 className="font-manrope text-xl font-bold text-primary">
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
                          <p className="text-sm font-bold text-[#7fa11c]">
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
              <article className="rounded-xl bg-primary-container p-6 text-white shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                  Trust Score
                </p>
                 <p className="mt-2 font-manrope text-3xl font-black sm:text-4xl">
                  {profile?.trustScore ?? storedUser?.trustScore ?? 0}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Calculated from reviews received on completed bookings.
                </p>
              </article>

              <article className="rounded-xl bg-surface-container-lowest p-6 shadow-lg">
                <h3 className="font-manrope text-xl font-bold text-primary">
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
