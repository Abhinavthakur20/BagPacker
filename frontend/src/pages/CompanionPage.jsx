import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowISO = tomorrow.toISOString().slice(0, 10);
const DEFAULT_SOURCE = "New Delhi";
const DEFAULT_DESTINATION = "Spiti Valley";

export default function CompanionPage() {
  const token = useSelector((state) => state.auth.token);
  const loggedIn = Boolean(token);
  const navigate = useNavigate();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [travelDate, setTravelDate] = useState(tomorrowISO);
  const [postSource, setPostSource] = useState(DEFAULT_SOURCE);
  const [postDestination, setPostDestination] = useState(DEFAULT_DESTINATION);
  const [postTravelDate, setPostTravelDate] = useState(tomorrowISO);
  const [postMaxCompanions, setPostMaxCompanions] = useState(2);
  const [postNote, setPostNote] = useState("");
  const [matches, setMatches] = useState([]);
  const [personalPosts, setPersonalPosts] = useState([]);
  const [myPersonalPosts, setMyPersonalPosts] = useState([]);
  const [myRequests, setMyRequests] = useState({ sent: [], received: [] });
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [declined, setDeclined] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  const loadCompanionData = async (overrides = {}) => {
    if (!loggedIn) {
      return;
    }

    const activeSource = overrides.source ?? source;
    const activeDestination = overrides.destination ?? destination;
    const activeTravelDate = overrides.travelDate ?? travelDate;

    try {
      setIsLoading(true);
      setError("");
      const [foundMatches, requests, foundPosts, minePosts] = await Promise.all([
        api.get(
          `/companions/find?source=${encodeURIComponent(activeSource)}&destination=${encodeURIComponent(activeDestination)}&date=${activeTravelDate}`,
        ),
        api.get("/companions/my"),
        api.get(
          `/companions/posts?source=${encodeURIComponent(activeSource)}&destination=${encodeURIComponent(activeDestination)}&date=${activeTravelDate}`,
        ),
        api.get("/companions/posts/mine"),
      ]);

      setMatches(Array.isArray(foundMatches) ? foundMatches : []);
      setPersonalPosts(Array.isArray(foundPosts) ? foundPosts : []);
      setMyPersonalPosts(Array.isArray(minePosts) ? minePosts : []);
      setMyRequests(requests || { sent: [], received: [] });
      setIndex(0);
    } catch (fetchError) {
      setError(fetchError.message);
      setMatches([]);
      setPersonalPosts([]);
      setMyPersonalPosts([]);
      setMyRequests({ sent: [], received: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const resetSearchFilters = async () => {
    setSource(DEFAULT_SOURCE);
    setDestination(DEFAULT_DESTINATION);
    setTravelDate(tomorrowISO);
    await loadCompanionData({
      source: DEFAULT_SOURCE,
      destination: DEFAULT_DESTINATION,
      travelDate: tomorrowISO,
    });
  };

  const discoverItems = useMemo(() => {
    const bookingItems = (matches || []).map((item) => ({
      kind: "booking",
      id: `booking-${item.userId}`,
      userId: item.userId,
      requestId: item.request?.id || null,
      requestStatus: item.request?.status || null,
      requestDirection: item.request?.direction || null,
      name: item.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      dates: item.travelDate ? new Date(item.travelDate).toLocaleDateString("en-IN") : "Date flexible",
      bio: "Looking for a trusted travel companion.",
      trust: item.trustScore || 0,
      verificationStatus: item.verificationStatus || "pending",
      source: item.source,
      destination: item.destination,
      travelDate: item.travelDate,
      chatRoomId: item.request?.chatRoomId || null,
      seatsLeft: null,
      maxCompanions: null,
      note: "",
      postId: null,
    }));

    const postItems = (personalPosts || []).map((item) => ({
      kind: "post",
      id: `post-${item.postId}`,
      userId: item.ownerId,
      requestId: item.request?.id || null,
      requestStatus: item.request?.status || null,
      requestDirection: item.request?.direction || null,
      name: item.ownerName || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      dates: item.travelDate ? new Date(item.travelDate).toLocaleDateString("en-IN") : "Date flexible",
      bio: item.note || "Open personal trip post.",
      trust: item.trustScore || 0,
      verificationStatus: item.verificationStatus || "pending",
      source: item.source,
      destination: item.destination,
      travelDate: item.travelDate,
      chatRoomId: item.request?.chatRoomId || null,
      seatsLeft: item.seatsLeft,
      maxCompanions: item.maxCompanions,
      note: item.note || "",
      postId: item.postId,
    }));

    return [...postItems, ...bookingItems];
  }, [matches, personalPosts]);

  const current = useMemo(() => {
    if (!discoverItems.length) return null;

    return {
      ...discoverItems[index % discoverItems.length],
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
    };
  }, [discoverItems, index]);

  const requestRows = useMemo(() => {
    const sentRows = (myRequests.sent || []).map((item) => ({
      key: `sent-${item._id}`,
      requestId: item._id,
      name: item.receiverId?.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      status: item.status,
      requestType: item.requestType || "booking_match",
      direction: "outgoing",
      isChatEnabled: item.status === "accepted",
      chatRoomId: item.chatRoomId || null,
    }));

    const receivedRows = (myRequests.received || []).map((item) => ({
      key: `received-${item._id}`,
      requestId: item._id,
      name: item.requesterId?.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      status: item.status,
      requestType: item.requestType || "booking_match",
      direction: "incoming",
      isChatEnabled: item.status === "accepted",
      chatRoomId: item.chatRoomId || null,
    }));

    return [...sentRows, ...receivedRows];
  }, [myRequests]);

  const onDecision = async (type) => {
    if (!current) return;

    try {
      const isPost = current.kind === "post";
      const isIncomingPending =
        current.requestStatus === "pending" && current.requestDirection === "incoming";
      const isOutgoingPending =
        current.requestStatus === "pending" && current.requestDirection === "outgoing";
      const isAccepted = current.requestStatus === "accepted";

      if (type === "accept") {
        if (isAccepted) {
          navigate("/chat");
          return;
        }

        if (isIncomingPending) {
          await api.put(`/companions/${current.requestId}/respond`, {
            status: "accepted",
          });
          setAccepted((value) => value + 1);
          await loadCompanionData();
          await showSuccessAlert(
            "Companion accepted",
            "Your chat room is now available in the chat page.",
          );
          return;
        }

        if (isOutgoingPending) {
          await showSuccessAlert(
            "Request already sent",
            "This companion request is pending their response.",
          );
          return;
        }

        if (isPost) {
          if (Number(current.seatsLeft || 0) <= 0) {
            await showErrorAlert("Post full", "This personal trip post has no seats left.");
            return;
          }
          await api.post("/companions/posts/request", {
            postId: current.postId,
          });
        } else {
          await api.post("/companions/request", {
            receiverId: current.userId,
            source: current.source,
            destination: current.destination,
            travelDate,
          });
        }
        await loadCompanionData();
        await showSuccessAlert("Request sent", "Companion request sent successfully.");
        return;
      }

      if (isIncomingPending) {
        await api.put(`/companions/${current.requestId}/respond`, {
          status: "declined",
        });
        setDeclined((value) => value + 1);
        await loadCompanionData();
        await showSuccessAlert("Companion declined", "The request has been declined.");
        return;
      }

      setIndex((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Request update failed", requestError.message);
    }
  };

  const createPersonalTripPost = async () => {
    if (!loggedIn) {
      return;
    }

    try {
      setIsPosting(true);
      setError("");
      await api.post("/companions/posts", {
        source: postSource,
        destination: postDestination,
        travelDate: postTravelDate,
        maxCompanions: Number(postMaxCompanions),
        note: postNote,
      });
      setPostNote("");
      await loadCompanionData();
      await showSuccessAlert("Post created", "Your personal trip post is now live.");
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Post creation failed", requestError.message);
    } finally {
      setIsPosting(false);
    }
  };

  const respondFromRequestList = async (requestId, status) => {
    try {
      await api.put(`/companions/${requestId}/respond`, { status });
      if (status === "accepted") {
        setAccepted((value) => value + 1);
        await showSuccessAlert("Companion accepted", "Your chat room is now available in the chat page.");
      } else {
        setDeclined((value) => value + 1);
        await showSuccessAlert("Companion declined", "The request has been declined.");
      }
      await loadCompanionData();
    } catch (requestError) {
      setError(requestError.message);
      await showErrorAlert("Request update failed", requestError.message);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5b18]">
            Companion Finder
          </p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold text-[#132c22] sm:text-4xl">
            Find your travel companion
          </h1>
          <p className="mt-1 text-sm text-[#6b7069]">
            Match by route and date, then connect instantly.
          </p>
        </div>

        {!loggedIn ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 text-center font-semibold text-on-error-container">
            Please login to find and manage companion requests.
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 text-center font-semibold text-on-error-container">
            {error}
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl bg-[#f1eee7] p-3 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-bold text-[#1d2a24]">Find Travel Companions</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#6d746d]">
                trip_origin
              </span>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="w-full rounded-xl bg-white px-10 py-3 text-sm"
                placeholder="From"
              />
            </label>
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#6d746d]">
                near_me
              </span>
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="w-full rounded-xl bg-white px-10 py-3 text-sm"
                placeholder="To"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#6d746d]">
                calendar_month
              </span>
              <input
                type="date"
                value={travelDate}
                onChange={(event) => setTravelDate(event.target.value)}
                className="w-full rounded-xl bg-white px-10 py-3 text-sm"
              />
            </label>
            <button
              onClick={() => loadCompanionData()}
              disabled={!loggedIn || isLoading}
              className="rounded-xl bg-linear-to-r from-primary to-[#0f5a3d] px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Find Matches"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_290px]">
          <aside className="space-y-5">
            <article className="rounded-2xl bg-linear-to-br from-[#154f39] to-[#0f3f2e] p-4 text-white shadow-lg">
              <div className="flex items-end justify-between gap-2">
                <p className="font-headline text-5xl font-extrabold leading-none">
                  {discoverItems.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/80">
                  Live
                </p>
              </div>
              <p className="mt-2 text-2xl font-semibold leading-tight">
                Compatible companions
              </p>
              <p className="mt-1 text-sm text-white/75">
                Matching your selected route
              </p>
            </article>

            <article className="rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
              <p className="text-sm font-bold text-[#2f3a35]">
                Decision Stats
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-full bg-[#d8f5e5] px-3 py-2 text-xs font-semibold text-[#0f5f3f]">
                  Accepted{" "}
                  <span className="font-black">{accepted}</span>
                </div>
                <div className="rounded-full bg-[#ffdfe2] px-3 py-2 text-xs font-semibold text-[#a64040]">
                  Declined{" "}
                  <span className="font-black">{declined}</span>
                </div>
              </div>
            </article>

          </aside>

          <section>
            {current ? (
              <>
                <article className="relative overflow-hidden rounded-[28px] shadow-[0_18px_50px_rgba(17,48,35,0.2)]">
                  <img
                    src={current.image}
                    alt={current.name}
                    className="h-[430px] w-full object-cover object-top sm:h-[530px]"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#103f2f] via-[#103f2f]/35 to-transparent" />

                  <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#d8f5e8] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0f5f3f]">
                      {current.verificationStatus === "verified" ? "Verified" : "Unverified"}
                    </span>
                    <span className="rounded-full bg-[#b8e6ca] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0b4f35]">
                      {current.trust} Trust
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                    <h1 className="break-words font-headline text-3xl font-extrabold leading-tight sm:text-5xl">
                      {current.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-white/90">
                      <span>{current.route}</span>
                      <span>{current.dates}</span>
                      {current.kind === "post" ? (
                        <span>
                          Seats left: {current.seatsLeft}/{current.maxCompanions}
                        </span>
                      ) : null}
                      <span>
                        {current.requestStatus === "accepted"
                          ? "Matched"
                          : current.requestStatus === "pending" &&
                              current.requestDirection === "incoming"
                            ? "Incoming Request"
                            : current.requestStatus === "pending" &&
                                current.requestDirection === "outgoing"
                              ? "Request Sent"
                              : "Available"}
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90">
                      {current.bio}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                      {current.kind === "post" ? "Personal Trip Post" : "Booking Match"}
                    </p>
                  </div>
                </article>

                <div className="mt-7 flex items-center justify-center gap-8">
                  <button
                    onClick={() => onDecision("decline")}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#efb9be] bg-[#fff7f8] text-[#c4515f] transition hover:scale-105"
                    aria-label="Decline or skip companion"
                  >
                    <span className="material-symbols-outlined text-[30px]">
                      close
                    </span>
                  </button>
                  <button
                    onClick={() => onDecision("accept")}
                    disabled={current.kind === "post" && !current.requestId && Number(current.seatsLeft || 0) <= 0}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fd9d1a] text-[#2e2200] shadow-[0_14px_30px_rgba(253,157,26,0.35)] transition hover:scale-105"
                    aria-label="Primary companion action"
                  >
                    <span className="material-symbols-outlined text-[34px]">
                      {current.requestStatus === "accepted"
                        ? "chat"
                        : current.requestStatus === "pending" &&
                            current.requestDirection === "outgoing"
                          ? "schedule"
                          : "done"}
                    </span>
                  </button>
                  <button
                    onClick={() => setIndex((value) => value + 1)}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#bfd0d9] bg-[#f6fbff] text-[#517286] transition hover:scale-105"
                    aria-label="Skip companion"
                  >
                    <span className="material-symbols-outlined text-[30px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </>
            ) : (
              isLoading ? (
                <LoadingPanel label="Searching companions..." className="rounded-2xl" />
              ) : (
                <div className="rounded-2xl bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#6f736b]">
                    travel_explore
                  </span>
                  <p className="mt-3 font-semibold text-[#2a322d]">
                    No companions found for this route
                  </p>
                  <p className="mt-1 text-sm text-[#6f736b]">
                    Try a broader date or nearby destination.
                  </p>
                  <button
                    type="button"
                    onClick={resetSearchFilters}
                    className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                  >
                    Reset filters
                  </button>
                </div>
              )
            )}
          </section>

          <aside>
            <article className="rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <h2 className="font-headline text-2xl font-bold text-[#202925]">
                Create Personal Trip Post
              </h2>
              <div className="mt-3 space-y-2">
                <input
                  value={postSource}
                  onChange={(event) => setPostSource(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                  placeholder="Source city"
                />
                <input
                  value={postDestination}
                  onChange={(event) => setPostDestination(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                  placeholder="Destination city"
                />
                <input
                  type="date"
                  value={postTravelDate}
                  onChange={(event) => setPostTravelDate(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                />
                <select
                  value={postMaxCompanions}
                  onChange={(event) => setPostMaxCompanions(Number(event.target.value))}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <option value={2}>2 companions</option>
                  <option value={3}>3 companions</option>
                </select>
                <textarea
                  value={postNote}
                  onChange={(event) => setPostNote(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                  placeholder="Optional note for your post"
                  rows={3}
                />
                <button
                  onClick={createPersonalTripPost}
                  disabled={!loggedIn || isPosting}
                  className="w-full rounded-lg bg-[#275f49] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
                >
                  {isPosting ? "Posting..." : "Create Post"}
                </button>
              </div>
            </article>

            <article className="mt-5 rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-headline text-3xl font-bold text-[#202925]">
                My Requests
                <span className="rounded-full bg-[#aa5f00] px-2 py-0.5 text-[11px] font-bold text-white">
                  {requestRows.length}
                </span>
              </h2>

              <div className="mt-4 space-y-3">
                {requestRows.length ? (
                  requestRows.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border-l-3 border-[#f2a128] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#262e2a]">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#7b7f77]">
                            {item.route}
                          </p>
                        </div>
                        <span className="rounded-md bg-[#ffe8c2] px-2 py-1 text-[10px] font-bold uppercase text-[#9a5c00]">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#818780]">
                        {item.requestType === "personal_trip_post" ? "Personal Trip Post" : "Booking Match"}
                      </p>

                      {item.direction === "incoming" && item.status === "pending" ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => respondFromRequestList(item.requestId, "accepted")}
                            className="rounded-lg bg-[#275f49] py-2 text-xs font-bold uppercase tracking-wide text-white"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondFromRequestList(item.requestId, "declined")}
                            className="rounded-lg bg-[#b94a57] py-2 text-xs font-bold uppercase tracking-wide text-white"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}

                      {item.isChatEnabled ? (
                        <Link
                          to={item.chatRoomId ? `/chat?roomId=${encodeURIComponent(item.chatRoomId)}` : "/chat"}
                          className="mt-3 block w-full rounded-lg bg-[#275f49] py-2 text-center text-xs font-bold uppercase tracking-wide text-white"
                        >
                          Start Chat
                        </Link>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-white p-3 text-sm text-[#6b7069]">
                    No requests yet.
                  </div>
                )}
              </div>
            </article>

            <article className="mt-5 rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-headline text-2xl font-bold text-[#202925]">
                My Personal Posts
                <span className="rounded-full bg-[#275f49] px-2 py-0.5 text-[11px] font-bold text-white">
                  {myPersonalPosts.length}
                </span>
              </h2>
              <div className="mt-4 space-y-3">
                {myPersonalPosts.length ? (
                  myPersonalPosts.map((item) => (
                    <div key={item._id} className="rounded-xl border-l-3 border-[#275f49] bg-white p-3">
                      <p className="font-semibold text-[#262e2a]">
                        {item.source} -&gt; {item.destination}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7b7f77]">
                        {item.travelDate
                          ? new Date(item.travelDate).toLocaleDateString("en-IN")
                          : "Date flexible"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#6e736a]">
                        Accepted: {(item.acceptedCompanionIds || []).length}/{item.maxCompanions}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-xs text-[#6e736a]">{item.note}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-white p-3 text-sm text-[#6b7069]">
                    No personal posts yet.
                  </div>
                )}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
