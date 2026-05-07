import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { formatINR } from "../data/mockData";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const badgeStylesByStatus = {
  active: "bg-[#858585] text-[#f94a4a]",
  draft: "bg-surface-container-high text-on-surface-variant",
  completed: "bg-[#e2e8fb] text-[#858585]",
  cancelled: "bg-error-container text-error",
};

export default function OrganizerDashboardPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const [organizer, setOrganizer] = useState(null);
  const [trips, setTrips] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview"); // "overview" | "trips" | "social"
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [selectedComposerPreviewIndex, setSelectedComposerPreviewIndex] = useState(0);

  const loadDashboard = async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const [organizerProfile, organizerTrips, organizerPosts] = await Promise.all([
        api.get("/organizers/me"),
        api.get("/organizers/me/trips"),
        api.get("/organizers/me/posts"),
      ]);
      setOrganizer(organizerProfile);
      setTrips(
        Array.isArray(organizerTrips?.items)
          ? organizerTrips.items
          : Array.isArray(organizerTrips)
            ? organizerTrips
            : [],
      );
      setPosts(Array.isArray(organizerPosts) ? organizerPosts : []);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [isLoggedIn]);

  const dashboard = useMemo(() => {
    const totalTrips = trips.length;
    const activeTrips = trips.filter((trip) => trip.status === "active").length;
    const seatsFilled = trips.reduce(
      (sum, trip) => sum + Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats)),
      0,
    );
    const totalSeats = trips.reduce((sum, trip) => sum + safeNumber(trip.totalSeats), 0);
    const fillPercent = totalSeats ? Math.min(100, Math.round((seatsFilled / totalSeats) * 100)) : 0;
    const revenueEstimate = trips.reduce(
      (sum, trip) =>
        sum +
        Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats)) *
          safeNumber(trip.pricePerPerson),
      0,
    );
    const nextTrips = [...trips]
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime())
      .slice(0, 6);

    const cards = [
      {
        label: "Total Trips",
        value: totalTrips,
        icon: "map",
        tone: "neutral",
      },
      {
        label: "Active Trips",
        value: activeTrips,
        icon: "pace",
        tone: "neutral",
      },
      {
        label: "Seats Filled",
        value: `${seatsFilled}/${totalSeats || 0}`,
        helper: `${fillPercent}% occupancy`,
        icon: "group",
        tone: "neutral",
      },
      {
        label: "Revenue (est.)",
        value: formatINR(revenueEstimate),
        helper: "Based on seats filled",
        icon: "payments",
        tone: "primary",
      },
    ];

    return {
      cards,
      nextTrips,
      fillPercent,
      revenueEstimate,
      seatsFilled,
      totalSeats,
    };
  }, [trips]);

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to access your organizer dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  const approvalTone =
    organizer?.approvalStatus === "approved"
      ? "bg-[#858585] text-[#f94a4a]"
      : organizer?.approvalStatus === "rejected"
        ? "bg-error-container text-error"
        : "bg-[#3d4466] text-[#f94a4a]";
  const canCreateTrips = organizer?.approvalStatus === "approved";

  const sortedTrips = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [trips],
  );

  const previewProfileUrl = organizer?.userId?._id ? `/users/${organizer.userId._id}` : "/trips/search";

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

  const selectedComposerPreview = composerPreviews[selectedComposerPreviewIndex] || null;

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        {/* ── Sidebar ── */}
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

          <div className="mx-6 mb-8 rounded-2xl bg-surface-container-high/50 p-4 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary font-bold">
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

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto px-4 py-10 md:px-12">
          <div className="mx-auto max-w-6xl space-y-10">
            {/* Header Section */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface capitalize">
                  {activeView.replace("_", " ")} <span className="text-secondary">Dashboard</span>
                </h1>
                <p className="mt-1 text-sm text-on-surface-variant max-w-xl">
                  {activeView === "overview" && "High-level metrics and performance overview of your travel business."}
                  {activeView === "trips" && "Manage your posted expeditions, track seat fills, and start trips."}
                  {activeView === "social" && "Publish travel reels and photos to engage your audience."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/trips/create"
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-primary shadow-lg transition hover:scale-[1.02]"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Create Trip
                </Link>
                <button
                  onClick={loadDashboard}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-highest"
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
                {/* ── Overview Tab ── */}
                {activeView === "overview" && (
                  <div className="space-y-10">
                    {/* Stats Grid */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {dashboard.cards.map((card) => (
                        <article
                          key={card.label}
                          className="relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                                {card.label}
                              </p>
                              <p className="mt-3 font-headline text-2xl font-black text-on-surface">
                                {card.value}
                              </p>
                              {card.helper && (
                                <p className="mt-1 text-[9px] font-bold text-secondary uppercase tracking-widest">{card.helper}</p>
                              )}
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                              <span className="material-symbols-outlined text-[1.4rem]">{card.icon}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                      {/* Performance Chart / Occupancy */}
                      <section className="rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                        <h3 className="font-headline text-xl font-black text-on-surface">Expedition <span className="text-secondary">Reach</span></h3>
                        <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Real-time seat occupancy</p>
                        
                        <div className="mt-10 space-y-8">
                          <div>
                            <div className="flex items-end justify-between mb-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Average Occupancy</p>
                              <p className="font-headline text-3xl font-black text-primary">{dashboard.fillPercent}%</p>
                            </div>
                            <div className="h-4 overflow-hidden rounded-full bg-surface-container">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-primary to-secondary transition-all duration-1000"
                                style={{ width: `${dashboard.fillPercent}%` }}
                              />
                            </div>
                            <p className="mt-4 text-xs font-bold text-on-surface-variant">
                              {dashboard.seatsFilled} active travelers across {dashboard.totalSeats} capacity.
                            </p>
                          </div>

                          <div className="rounded-3xl bg-primary p-6 text-on-primary shadow-xl shadow-primary/10">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-primary/60">Estimated Revenue</p>
                              <span className="material-symbols-outlined text-on-primary/40">payments</span>
                            </div>
                            <p className="mt-3 font-headline text-3xl font-black">{formatINR(dashboard.revenueEstimate)}</p>
                            <div className="mt-4 flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                              <p className="text-[9px] font-bold uppercase tracking-widest text-on-primary/70">Calculated from confirmed bookings</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Quick Actions */}
                      <section className="space-y-6">
                        <div className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                          <h3 className="font-headline text-lg font-black text-on-surface">Quick <span className="text-secondary">Actions</span></h3>
                          <div className="mt-6 grid gap-3">
                            <Link to="/trips/search" className="flex items-center justify-between rounded-2xl bg-surface-container-low px-5 py-4 text-[11px] font-black uppercase tracking-widest text-primary transition hover:bg-surface-container">
                              Browse All Trips
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                            <button onClick={() => setActiveView("trips")} className="flex items-center justify-between rounded-2xl bg-surface-container-low px-5 py-4 text-[11px] font-black uppercase tracking-widest text-primary transition hover:bg-surface-container">
                              Manage Active Trips
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                            <button onClick={() => setActiveView("social")} className="flex items-center justify-between rounded-2xl bg-surface-container-low px-5 py-4 text-[11px] font-black uppercase tracking-widest text-primary transition hover:bg-surface-container">
                              Update Social Feed
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-outline-variant/10 bg-secondary/5 p-6 border-dashed">
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2 text-center">Marketplace Status</p>
                          <p className="text-xs text-center text-on-surface-variant leading-relaxed">
                            {canCreateTrips ? "Your profile is verified. You have full access to publish and start trips." : "Your profile is under audit. Public listing will be enabled after verification."}
                          </p>
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {/* ── My Posted Trips Tab ── */}
                {activeView === "trips" && (
                  <section className="rounded-3xl border border-outline-variant/20 bg-surface shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 px-8 py-6 bg-surface-container-low/30">
                      <div>
                        <h3 className="font-headline text-xl font-black text-on-surface">Inventory <span className="text-secondary">Control</span></h3>
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Manage your active listings</p>
                      </div>
                      <Link to="/trips/create" className="rounded-xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-primary">New Listing</Link>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-surface-container-low/20 text-[10px] font-black uppercase tracking-widest text-outline-variant">
                          <tr>
                            <th className="px-8 py-4">Expedition Details</th>
                            <th className="px-6 py-4">Status & Logistics</th>
                            <th className="px-6 py-4">Occupancy</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                          {sortedTrips.map((trip) => {
                             const soldSeats = Math.max(0, safeNumber(trip.totalSeats) - safeNumber(trip.availableSeats));
                             const occupancy = trip.totalSeats ? Math.min(100, Math.round((soldSeats / trip.totalSeats) * 100)) : 0;
                             return (
                               <tr key={trip._id} className="group transition hover:bg-surface-container-lowest">
                                 <td className="px-8 py-6">
                                   <div className="min-w-0 max-w-[280px]">
                                     <p className="truncate font-headline text-base font-black text-on-surface">{trip.title}</p>
                                     <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-primary">
                                       <span>{trip.source}</span>
                                       <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                       <span>{trip.destination}</span>
                                     </div>
                                     <p className="mt-2 text-[10px] font-black text-outline-variant uppercase">{formatINR(trip.pricePerPerson)} / Seat</p>
                                   </div>
                                 </td>
                                 <td className="px-6 py-6">
                                   <div className="flex flex-col gap-2">
                                     <span className={`inline-flex w-fit rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${badgeStylesByStatus[trip.status] || 'bg-surface-container text-on-surface-variant'}`}>
                                       {trip.status}
                                     </span>
                                     <p className="text-[10px] font-bold text-on-surface-variant uppercase">{trip.transportType?.replace('_', ' ')}</p>
                                     <p className="text-[9px] font-bold text-outline-variant">{trip.startedAt ? "Expedition In-Progress" : "Scheduled Departure"}</p>
                                   </div>
                                 </td>
                                 <td className="px-6 py-6">
                                   <div className="w-32">
                                     <div className="flex items-center justify-between mb-1.5">
                                       <p className="text-[10px] font-black text-on-surface">{soldSeats} / {trip.totalSeats}</p>
                                       <p className="text-[10px] font-black text-secondary">{occupancy}%</p>
                                     </div>
                                     <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                                       <div className="h-full rounded-full bg-secondary" style={{ width: `${occupancy}%` }} />
                                     </div>
                                   </div>
                                 </td>
                                 <td className="px-8 py-6">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
                                      {trip.status === "active" && !trip.startedAt && (
                                        <button
                                          onClick={() => api.put(`/trips/${trip._id}/start`, {}).then(loadDashboard)}
                                          className="rounded-lg bg-secondary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-secondary"
                                        >
                                          Start
                                        </button>
                                      )}
                                      <Link to={`/dashboard/organizer/trips/${trip._id}`} className="rounded-lg bg-primary px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-primary">Buyers</Link>
                                      <Link to={`/trips/${trip._id}/edit`} className="rounded-lg bg-surface-container px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Edit</Link>
                                   </div>
                                 </td>
                               </tr>
                             )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* ── Social Profile Tab ── */}
                {activeView === "social" && (
                  <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                    <section className="space-y-8">
                      <article className="rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                        <h3 className="font-headline text-xl font-black text-on-surface">Media <span className="text-secondary">Composer</span></h3>
                        <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Publish to your traveler feed</p>

                        <div className="mt-8 grid gap-8 lg:grid-cols-2">
                           <div className="aspect-square overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/10">
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
                                  <p className="text-[9px] font-black uppercase tracking-widest text-outline-variant mb-3">Caption & Tags</p>
                                  <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Tell the story of this trip..."
                                    className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 text-sm text-on-surface outline-none focus:border-primary/40 transition min-h-[140px]"
                                  />
                                </div>
                                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/20 bg-surface-container-lowest p-6 text-primary transition hover:bg-surface-container">
                                  <span className="material-symbols-outlined">upload_file</span>
                                  <span className="text-[11px] font-black uppercase tracking-widest">Upload Files</span>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={(e) => setMediaFiles(Array.from(e.target.files))}
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

                        {mediaFiles.length > 0 && (
                          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                            {composerPreviews.map((p, i) => (
                              <button key={i} onClick={() => setSelectedComposerPreviewIndex(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === selectedComposerPreviewIndex ? 'border-primary' : 'border-transparent'}`}>
                                {p.isVideo ? <div className="h-full w-full bg-on-surface/10 flex items-center justify-center"><span className="material-symbols-outlined text-xs">play_circle</span></div> : <img src={p.url} className="h-full w-full object-cover" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>

                      <article className="rounded-[2.5rem] border border-outline-variant/20 bg-surface p-8 shadow-sm">
                         <h3 className="font-headline text-xl font-black text-on-surface">Gallery <span className="text-secondary">Archive</span></h3>
                         <div className="mt-8 grid grid-cols-3 gap-4">
                            {posts.map((post) => (
                               <div key={post._id} className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-container">
                                  <img
                                    src={optimizeCloudinaryImage(resolveMediaUrl(post.media[0]?.url), "f_auto,q_auto,w_600")}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                    alt="Social post"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                     <button
                                       onClick={() => removePost(post._id)}
                                       className="h-10 w-10 rounded-full bg-error text-on-error flex items-center justify-center"
                                     >
                                       <span className="material-symbols-outlined">delete</span>
                                     </button>
                                  </div>
                               </div>
                            ))}
                            {posts.length === 0 && (
                              <div className="col-span-full py-20 text-center">
                                <span className="material-symbols-outlined text-5xl text-outline-variant/30">photo_library</span>
                                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-outline-variant">No posts published yet</p>
                              </div>
                            )}
                         </div>
                      </article>
                    </section>

                    <aside className="space-y-6">
                      <div className="rounded-3xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
                        <h3 className="font-headline text-lg font-black text-on-surface">Profile <span className="text-secondary">Audit</span></h3>
                        <div className="mt-6 space-y-5">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-sm mt-0.5">verified</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Business Name</p>
                              <p className="text-xs font-bold text-on-surface-variant mt-0.5">{organizer?.businessName || "Pending Setup"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-sm mt-0.5">assignment_ind</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Official License</p>
                              <p className="text-xs font-bold text-on-surface-variant mt-0.5">{organizer?.licenseUrl ? "Active & Verified" : "Verification Pending"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-sm mt-0.5">contact_mail</span>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Support Email</p>
                              <p className="text-xs font-bold text-on-surface-variant mt-0.5">{user?.email}</p>
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
