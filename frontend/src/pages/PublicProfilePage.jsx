import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api, optimizeCloudinaryImage, resolveMediaUrl } from "../lib/api";

export default function PublicProfilePage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const { id } = useParams();
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPostIndex, setSelectedPostIndex] = useState(-1);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowingBusy, setIsFollowingBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPublicProfile = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [organizerResponse, userReviews] = await Promise.all([
          api.get(`/organizers/public/user/${id}`),
          api.get(`/reviews/${id}?page=1&limit=20`),
        ]);
        setOrganizerProfile(organizerResponse.organizer);
        const nextPosts = Array.isArray(organizerResponse?.posts) ? organizerResponse.posts : [];
        setPosts(nextPosts);
        setPostsCount(Number(organizerResponse?.organizer?.postsCount || nextPosts.length || 0));
        setFollowersCount(Number(organizerResponse?.organizer?.followersCount || 0));
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

    loadPublicProfile();
  }, [id]);

  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!isLoggedIn || !organizerProfile?._id) {
        return;
      }

      try {
        const response = await api.get(`/organizers/${organizerProfile._id}/follow-status`);
        setFollowing(Boolean(response?.following));
        if (typeof response?.followersCount === "number") {
          setFollowersCount(response.followersCount);
        }
      } catch {
        setFollowing(false);
      }
    };

    loadFollowStatus();
  }, [isLoggedIn, organizerProfile?._id]);

  const isOwnProfile =
    String(organizerProfile?.userId?._id || "") === String(user?._id || "");

  const gridPosts = useMemo(
    () =>
      posts.filter((post) => Array.isArray(post.media) && post.media.length > 0),
    [posts],
  );

  const selectedPost =
    selectedPostIndex >= 0 ? gridPosts[selectedPostIndex] || null : null;
  const selectedMedia = selectedPost?.media?.[selectedMediaIndex] || null;

  const toggleFollow = async () => {
    if (!isLoggedIn || !organizerProfile?._id || isOwnProfile) {
      return;
    }

    try {
      setIsFollowingBusy(true);
      if (following) {
        const response = await api.del(`/organizers/${organizerProfile._id}/follow`);
        setFollowing(false);
        setFollowersCount(Number(response?.followersCount || 0));
      } else {
        const response = await api.post(`/organizers/${organizerProfile._id}/follow`, {});
        setFollowing(true);
        setFollowersCount(Number(response?.followersCount || 0));
      }
    } finally {
      setIsFollowingBusy(false);
    }
  };

  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-10">
        <div className="flex items-center justify-end">
          <Link
            to="/trips/search"
            className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-primary"
          >
            Back to Trips
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl bg-error-container p-4 font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        {isLoading ? <LoadingPanel label="Loading profile..." variant="page" /> : null}

        {!isLoading && organizerProfile ? (
          <>
            <article className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-6 shadow-sm md:p-8">
              <div className="grid gap-6 md:grid-cols-[150px_1fr] md:items-center">
                <img
                  src={
                    resolveMediaUrl(organizerProfile.userId?.avatarUrl) ||
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80"
                  }
                  alt={organizerProfile.userId?.name || "Organizer"}
                  className="mx-auto h-28 w-28 rounded-full border-2 border-outline-variant/30 object-cover md:h-36 md:w-36"
                />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-manrope text-2xl font-extrabold text-primary">
                      {organizerProfile.businessName || "organizer"}
                    </h2>
                    {!isOwnProfile ? (
                      <button
                        type="button"
                        onClick={toggleFollow}
                        disabled={!isLoggedIn || isFollowingBusy}
                        className={`rounded-lg px-4 py-2 text-sm font-bold ${
                          following
                            ? "border border-outline-variant/60 bg-surface-container-low text-primary"
                            : "bg-primary text-white"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {isFollowingBusy ? "Please wait..." : following ? "Following" : "Follow"}
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <p><span className="font-black text-primary">{postsCount}</span> posts</p>
                    <p><span className="font-black text-primary">{followersCount}</span> followers</p>
                    <p><span className="font-black text-primary">{organizerProfile.userId?.trustScore ?? 0}</span> trust</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">
                      @{organizerProfile.userId?.name || "organizer"}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      Verified travel organizer profile
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="border-t border-outline-variant/30 pt-4">
              <div className="mb-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("posts")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                    activeTab === "posts"
                      ? "bg-primary text-white"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">grid_on</span>
                  Posts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reviews")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                    activeTab === "reviews"
                      ? "bg-primary text-white"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">reviews</span>
                  Reviews
                </button>
              </div>

              {activeTab === "posts" ? (
                gridPosts.length ? (
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {gridPosts.map((post, index) => {
                      const firstMedia = post.media[0];
                      return (
                        <button
                          key={post._id}
                          type="button"
                          onClick={() => {
                            setSelectedPostIndex(index);
                            setSelectedMediaIndex(0);
                          }}
                          className="group relative aspect-square overflow-hidden bg-surface-container-low"
                        >
                          {firstMedia.mediaType === "video" ? (
                            <video
                              src={resolveMediaUrl(firstMedia.url)}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={optimizeCloudinaryImage(resolveMediaUrl(firstMedia.url), "f_auto,q_auto,w_700")}
                              alt={post.caption || "Post"}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {post.media.length > 1 ? (
                            <span className="material-symbols-outlined absolute right-2 top-2 text-white drop-shadow">
                              collections
                            </span>
                          ) : null}
                          {firstMedia.mediaType === "video" ? (
                            <span className="material-symbols-outlined absolute left-2 top-2 text-white drop-shadow">
                              play_circle
                            </span>
                          ) : null}
                          <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">
                    No posts yet.
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {reviews.length ? (
                    reviews.map((review) => (
                      <div key={review._id} className="rounded-2xl bg-surface-container-low p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-primary">{review.reviewerId?.name || "Traveler"}</p>
                          <p className="text-sm font-bold text-[#7fa11c]">{review.rating}/5</p>
                        </div>
                        <p className="mt-2 text-sm text-on-surface-variant">
                          {review.comment || "No comment shared."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-4 text-on-surface-variant">
                      No public reviews yet.
                    </div>
                  )}
                </div>
              )}
            </article>
          </>
        ) : null}
      </section>

      {selectedPost ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedPostIndex(-1)}
        >
          <div
            className="grid h-[82vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black md:grid-cols-[1fr_360px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex items-center justify-center bg-black">
              {selectedMedia?.mediaType === "video" ? (
                <video
                  src={resolveMediaUrl(selectedMedia.url)}
                  controls
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  src={optimizeCloudinaryImage(resolveMediaUrl(selectedMedia?.url || ""), "f_auto,q_auto,w_1400")}
                  alt={selectedPost.caption || "Post media"}
                  className="max-h-full max-w-full object-contain"
                />
              )}
              {selectedPost.media?.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMediaIndex((prev) =>
                        prev === 0 ? selectedPost.media.length - 1 : prev - 1,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMediaIndex((prev) => (prev + 1) % selectedPost.media.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </>
              ) : null}
            </div>
            <aside className="flex flex-col bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant/25 p-4">
                <p className="font-bold text-primary">@{organizerProfile?.userId?.name || "organizer"}</p>
                <button
                  type="button"
                  onClick={() => setSelectedPostIndex(-1)}
                  className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="grow overflow-y-auto p-4 text-sm text-on-surface-variant">
                {selectedPost.caption || "No caption"}
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}

