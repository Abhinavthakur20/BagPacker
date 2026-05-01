import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import TravelCopilotPanel from "../components/TravelCopilotPanel";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowISO = tomorrow.toISOString().slice(0, 10);
const DEFAULT_SOURCE = "New Delhi";
const DEFAULT_DESTINATION = "Spiti Valley";

const formatTravelDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date flexible";

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

const getScoreBadge = (score) => `${Math.round(Number(score || 0))}% fit`;

const getAvailabilityLabel = (item) => {
  if (item.requestStatus === "accepted") {
    return "Matched";
  }
  if (item.requestStatus === "pending" && item.requestDirection === "incoming") {
    return "Incoming Request";
  }
  if (item.requestStatus === "pending" && item.requestDirection === "outgoing") {
    return "Request Sent";
  }
  return "Available";
};

const getRequestPriority = (item) => {
  if (item.direction === "incoming" && item.status === "pending") {
    return 0;
  }
  if (item.status === "accepted") {
    return 1;
  }
  if (item.direction === "outgoing" && item.status === "pending") {
    return 2;
  }
  return 3;
};

export default function CompanionPage() {
  const token = useSelector((state) => state.auth.token);
  const loggedIn = Boolean(token);
  const navigate = useNavigate();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [travelDate, setTravelDate] = useState(tomorrowISO);
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [searchGenderPreference, setSearchGenderPreference] = useState("Any");
  const [searchVehicleType, setSearchVehicleType] = useState("");
  const [postSource, setPostSource] = useState(DEFAULT_SOURCE);
  const [postDestination, setPostDestination] = useState(DEFAULT_DESTINATION);
  const [postTravelDate, setPostTravelDate] = useState(tomorrowISO);
  const [postSeatsAvailable, setPostSeatsAvailable] = useState(2);
  const [postGenderPreference, setPostGenderPreference] = useState("Any");
  const [postVehicleType, setPostVehicleType] = useState("");
  const [postNote, setPostNote] = useState("");
  const [matches, setMatches] = useState([]);
  const [personalPosts, setPersonalPosts] = useState([]);
  const [myPersonalPosts, setMyPersonalPosts] = useState([]);
  const [myRequests, setMyRequests] = useState({ sent: [], received: [] });
  const [notifications, setNotifications] = useState([]);
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [declined, setDeclined] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState("requests");

  const buildSearchQuery = (overrides = {}) => {
    const params = new URLSearchParams({
      source: overrides.source ?? source,
      destination: overrides.destination ?? destination,
      date: overrides.travelDate ?? travelDate,
      page: "1",
      limit: "50",
      seatsRequested: String(overrides.requestedSeats ?? requestedSeats),
    });

    const genderPreference = overrides.searchGenderPreference ?? searchGenderPreference;
    if (genderPreference && genderPreference !== "Any") {
      params.set("genderPreference", genderPreference);
    }

    const vehicleType = overrides.searchVehicleType ?? searchVehicleType;
    if (vehicleType) {
      params.set("vehicleType", vehicleType);
    }

    return params.toString();
  };

  const loadCompanionData = async (overrides = {}) => {
    if (!loggedIn) {
      return;
    }

    try {
      setIsLoading(true);
      setPageError("");

      const searchQuery = buildSearchQuery(overrides);
      const bookingQuery = new URLSearchParams({
        source: overrides.source ?? source,
        destination: overrides.destination ?? destination,
        date: overrides.travelDate ?? travelDate,
        page: "1",
        limit: "50",
      }).toString();

      const [foundMatches, requests, foundPosts, minePosts, userNotifications] = await Promise.all([
        api.get(`/companions/find?${bookingQuery}`, { cacheTtlMs: 25000 }),
        api.get("/companions/my?page=1&limit=50", { cacheTtlMs: 15000 }),
        api.get(`/companions/search?${searchQuery}`, { cacheTtlMs: 25000 }),
        api.get("/companions/posts/mine?page=1&limit=50"),
        api.get("/notifications?page=1&limit=25", { cacheTtlMs: 10000 }),
      ]);

      setMatches(
        Array.isArray(foundMatches?.items)
          ? foundMatches.items
          : Array.isArray(foundMatches)
            ? foundMatches
            : [],
      );
      setPersonalPosts(
        Array.isArray(foundPosts?.items)
          ? foundPosts.items
          : Array.isArray(foundPosts?.data)
            ? foundPosts.data
            : [],
      );
      setMyPersonalPosts(
        Array.isArray(minePosts?.items)
          ? minePosts.items
          : Array.isArray(minePosts)
            ? minePosts
            : [],
      );
      setMyRequests(requests || { sent: [], received: [] });
      setNotifications(Array.isArray(userNotifications?.items) ? userNotifications.items : []);
      setIndex(0);
    } catch (fetchError) {
      setPageError(fetchError.message);
      setMatches([]);
      setPersonalPosts([]);
      setMyPersonalPosts([]);
      setMyRequests({ sent: [], received: [] });
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useEffect(() => {
    if (!isInboxOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInboxOpen]);

  const resetSearchFilters = async () => {
    setSource(DEFAULT_SOURCE);
    setDestination(DEFAULT_DESTINATION);
    setTravelDate(tomorrowISO);
    setRequestedSeats(1);
    setSearchGenderPreference("Any");
    setSearchVehicleType("");
    await loadCompanionData({
      source: DEFAULT_SOURCE,
      destination: DEFAULT_DESTINATION,
      travelDate: tomorrowISO,
      requestedSeats: 1,
      searchGenderPreference: "Any",
      searchVehicleType: "",
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
      dates: formatTravelDate(item.travelDate),
      matchLabel: item.matchLabel || "Route match",
      score: Number(item.score || 0),
      trust: item.trustScore || 0,
      verificationStatus: item.verificationStatus || "unverified",
      source: item.source,
      destination: item.destination,
      travelDate: item.travelDate,
      chatRoomId: item.request?.chatRoomId || null,
      seatsAvailable: null,
      seatsCapacity: null,
      genderPreference: item.request?.genderPreference || "Any",
      vehicleType: item.request?.vehicleType || null,
      note: "Matched from an existing BagPacker booking.",
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
      dates: formatTravelDate(item.travelDate),
      matchLabel: item.matchLabel || "Route match",
      score: Number(item.score || 0),
      trust: item.trustScore || 0,
      verificationStatus: item.verificationStatus || "unverified",
      source: item.source,
      destination: item.destination,
      travelDate: item.travelDate,
      chatRoomId: item.request?.chatRoomId || null,
      seatsAvailable: item.seatsAvailable,
      seatsCapacity: item.maxCompanions,
      genderPreference: item.genderPreference || "Any",
      vehicleType: item.vehicleType || null,
      note: item.note || "Open personal trip post.",
      postId: item.postId,
    }));

    return [...postItems, ...bookingItems].sort((first, second) => {
      const firstPriority =
        first.requestStatus === "pending" && first.requestDirection === "incoming" ? 0 : 1;
      const secondPriority =
        second.requestStatus === "pending" && second.requestDirection === "incoming" ? 0 : 1;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      return Number(second.score || 0) - Number(first.score || 0);
    });
  }, [matches, personalPosts]);

  const current = useMemo(() => {
    if (!discoverItems.length) {
      return null;
    }

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
      dateLabel: formatTravelDate(item.travelDate),
      createdLabel: formatDateTime(item.createdAt),
      status: item.status,
      requestType: item.requestType || "booking_match",
      direction: "outgoing",
      isChatEnabled: item.status === "accepted",
      chatRoomId: item.chatRoomId || null,
      seatsRequested: Number(item.seatsRequested || 1),
      genderPreference: item.genderPreference || "Any",
      vehicleType: item.vehicleType || null,
    }));

    const receivedRows = (myRequests.received || []).map((item) => ({
      key: `received-${item._id}`,
      requestId: item._id,
      name: item.requesterId?.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      dateLabel: formatTravelDate(item.travelDate),
      createdLabel: formatDateTime(item.createdAt),
      status: item.status,
      requestType: item.requestType || "booking_match",
      direction: "incoming",
      isChatEnabled: item.status === "accepted",
      chatRoomId: item.chatRoomId || null,
      seatsRequested: Number(item.seatsRequested || 1),
      genderPreference: item.genderPreference || "Any",
      vehicleType: item.vehicleType || null,
    }));

    return [...receivedRows, ...sentRows].sort((first, second) => {
      const priorityDelta = getRequestPriority(first) - getRequestPriority(second);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return second.createdLabel.localeCompare(first.createdLabel);
    });
  }, [myRequests]);

  const pendingIncomingCount = requestRows.filter(
    (item) => item.direction === "incoming" && item.status === "pending",
  ).length;
  const unreadNotificationCount = notifications.filter((item) => !item.isRead).length;
  const inboxCount = pendingIncomingCount + unreadNotificationCount;
  const copilotContext = useMemo(
    () => ({
      source: current?.source || source,
      destination: current?.destination || destination,
      travelDate: current?.travelDate || travelDate,
      seatsRequested: requestedSeats,
      genderPreference: searchGenderPreference,
      vehicleType: searchVehicleType || current?.vehicleType || "",
      companionName: current?.name || "",
      note: current?.note || "",
    }),
    [
      current,
      destination,
      requestedSeats,
      searchGenderPreference,
      searchVehicleType,
      source,
      travelDate,
    ],
  );

  const markNotificationRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {});
      setNotifications((currentItems) =>
        currentItems.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );
    } catch (requestError) {
      await showErrorAlert("Could not update notification", requestError.message);
    }
  };

  const onDecision = async (type) => {
    if (!current) {
      return;
    }

    try {
      const isPost = current.kind === "post";
      const isIncomingPending =
        current.requestStatus === "pending" && current.requestDirection === "incoming";
      const isOutgoingPending =
        current.requestStatus === "pending" && current.requestDirection === "outgoing";
      const isAccepted = current.requestStatus === "accepted";

      if (type === "accept") {
        if (isAccepted) {
          navigate(
            current.chatRoomId ? `/chat?roomId=${encodeURIComponent(current.chatRoomId)}` : "/chat",
          );
          return;
        }

        if (isIncomingPending) {
          await api.patch(`/companions/${current.requestId}/accept`, {});
          setAccepted((value) => value + 1);
          await loadCompanionData();
          await showSuccessAlert(
            "Companion accepted",
            "Your chat room is now available in the inbox and chat page.",
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

        if (isPost && Number(current.seatsAvailable || 0) < Number(requestedSeats)) {
          await showErrorAlert(
            "Post full",
            "This personal trip post does not have enough seats left.",
          );
          return;
        }

        await api.post(
          "/companions",
          isPost
            ? {
                personalTripPostId: current.postId,
                seatsRequested: Number(requestedSeats),
                genderPreference: searchGenderPreference,
                ...(searchVehicleType ? { vehicleType: searchVehicleType } : {}),
              }
            : {
                receiverId: current.userId,
                source: current.source,
                destination: current.destination,
                travelDate,
                seatsRequested: Number(requestedSeats),
                genderPreference: searchGenderPreference,
                ...(searchVehicleType ? { vehicleType: searchVehicleType } : {}),
              },
        );

        await loadCompanionData();
        await showSuccessAlert("Request sent", "Open the inbox anytime to track responses.");
        return;
      }

      if (isIncomingPending) {
        await api.patch(`/companions/${current.requestId}/decline`, {});
        setDeclined((value) => value + 1);
        await loadCompanionData();
        await showSuccessAlert("Companion declined", "The request was moved out of your pending inbox.");
        return;
      }

      setIndex((value) => value + 1);
    } catch (requestError) {
      await showErrorAlert("Request update failed", requestError.message);
    }
  };

  const createPersonalTripPost = async () => {
    if (!loggedIn) {
      return;
    }

    try {
      setIsPosting(true);
      await api.post("/companions/posts", {
        source: postSource,
        destination: postDestination,
        travelDate: postTravelDate,
        seatsAvailable: Number(postSeatsAvailable),
        genderPreference: postGenderPreference,
        ...(postVehicleType ? { vehicleType: postVehicleType } : {}),
        note: postNote,
      });
      setPostNote("");
      await loadCompanionData();
      await showSuccessAlert("Post created", "Your personal trip post is now live.");
    } catch (requestError) {
      await showErrorAlert("Post creation failed", requestError.message);
    } finally {
      setIsPosting(false);
    }
  };

  const respondFromInbox = async (requestId, status) => {
    try {
      await api.patch(
        `/companions/${requestId}/${status === "accepted" ? "accept" : "decline"}`,
        {},
      );
      if (status === "accepted") {
        setAccepted((value) => value + 1);
        await showSuccessAlert("Companion accepted", "Your chat room is ready.");
      } else {
        setDeclined((value) => value + 1);
        await showSuccessAlert("Companion declined", "The request has been removed from pending.");
      }
      await loadCompanionData();
    } catch (requestError) {
      await showErrorAlert("Request update failed", requestError.message);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5b18]">
              Companion Finder
            </p>
            <h1 className="mt-1 font-headline text-xl font-extrabold text-[#132c22] sm:text-2xl">
              Find your travel companion
            </h1>
            <p className="mt-1 text-sm text-[#6b7069]">
              Search by route, date, seats, and preferences, then compare how close each match is.
            </p>
          </div>

          {loggedIn ? (
            <button
              type="button"
              onClick={() => {
                setInboxTab("requests");
                setIsInboxOpen(true);
              }}
              className="inline-flex items-center gap-3 self-start rounded-2xl border border-[#d8d2c7] bg-white px-4 py-3 shadow-sm"
            >
              <span className="material-symbols-outlined text-[#184b38]">notifications</span>
              <span className="text-left">
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#8a5b18]">
                  Companion Inbox
                </span>
                <span className="block text-sm font-semibold text-[#21332b]">
                  {pendingIncomingCount} pending, {unreadNotificationCount} unread
                </span>
              </span>
            </button>
          ) : null}
        </div>

        {!loggedIn ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 text-center font-semibold text-on-error-container">
            Please login to find and manage companion requests.
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-6 rounded-2xl bg-error-container p-4 text-center font-semibold text-on-error-container">
            {pageError}
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
          <div className="mb-3">
            <p className="text-sm font-bold text-[#1d2a24]">Find Travel Companions</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
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
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <select
              value={requestedSeats}
              onChange={(event) => setRequestedSeats(Number(event.target.value))}
              className="rounded-xl bg-white px-4 py-3 text-sm"
            >
              <option value={1}>1 seat</option>
              <option value={2}>2 seats</option>
              <option value={3}>3 seats</option>
              <option value={4}>4 seats</option>
            </select>
            <select
              value={searchGenderPreference}
              onChange={(event) => setSearchGenderPreference(event.target.value)}
              className="rounded-xl bg-white px-4 py-3 text-sm"
            >
              <option value="Any">Any gender</option>
              <option value="F">Female only</option>
              <option value="M">Male only</option>
            </select>
            <select
              value={searchVehicleType}
              onChange={(event) => setSearchVehicleType(event.target.value)}
              className="rounded-xl bg-white px-4 py-3 text-sm"
            >
              <option value="">Any vehicle</option>
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
            <button
              onClick={() => loadCompanionData()}
              disabled={!loggedIn || isLoading}
              className="rounded-xl bg-linear-to-r from-primary to-[#0f5a3d] px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Find Matches"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="space-y-5">
            <article className="rounded-2xl bg-linear-to-br from-[#154f39] to-[#0f3f2e] p-4 text-white shadow-lg">
              <div className="flex items-end justify-between gap-2">
                <p className="font-headline text-3xl font-extrabold leading-none">
                  {discoverItems.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/80">
                  Live
                </p>
              </div>
              <p className="mt-2 text-lg font-semibold leading-tight">
                Compatible companions
              </p>
              <p className="mt-1 text-sm text-white/75">
                Ranked by route, date closeness, and trust.
              </p>
            </article>

            <article className="rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
              <p className="text-sm font-bold text-[#2f3a35]">Search Snapshot</p>
              <div className="mt-3 space-y-2 text-sm text-[#546059]">
                <p>{`${source} -> ${destination}`}</p>
                <p>{formatTravelDate(travelDate)}</p>
                <p>{requestedSeats} seat{requestedSeats > 1 ? "s" : ""} requested</p>
                <p>
                  {searchGenderPreference === "Any"
                    ? "Any gender"
                    : `${searchGenderPreference} preference`}
                  {" | "}
                  {searchVehicleType || "Any vehicle"}
                </p>
              </div>
            </article>

            <article className="rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
              <p className="text-sm font-bold text-[#2f3a35]">Decision Stats</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-full bg-[#d8f5e5] px-3 py-2 text-xs font-semibold text-[#0f5f3f]">
                  Accepted <span className="font-black">{accepted}</span>
                </div>
                <div className="rounded-full bg-[#ffdfe2] px-3 py-2 text-xs font-semibold text-[#a64040]">
                  Declined <span className="font-black">{declined}</span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#2f3a35]">Inbox Summary</p>
                  <p className="mt-1 text-sm text-[#667068]">
                    {pendingIncomingCount} requests need action
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInboxTab("requests");
                    setIsInboxOpen(true);
                  }}
                  className="rounded-xl bg-[#1a513d] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
                >
                  Open Inbox
                </button>
              </div>
            </article>

            <TravelCopilotPanel context={copilotContext} />
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
                    <span className="rounded-full bg-[#ffe9bf] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#8a5700]">
                      {getScoreBadge(current.score)}
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                    <h1 className="break-words font-headline text-xl font-extrabold leading-tight sm:text-3xl">
                      {current.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                      <span>{current.route}</span>
                      <span>{current.dates}</span>
                      <span>{current.matchLabel}</span>
                      {current.kind === "post" ? (
                        <span>
                          {current.seatsAvailable}/{current.seatsCapacity} seats left
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em]">
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        {current.genderPreference === "Any"
                          ? "Any gender"
                          : `${current.genderPreference} preference`}
                      </span>
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        {current.vehicleType || "Any vehicle"}
                      </span>
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        Requesting {requestedSeats} seat{requestedSeats > 1 ? "s" : ""}
                      </span>
                      <span className="rounded-full bg-white/15 px-3 py-1">
                        {getAvailabilityLabel(current)}
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90">
                      {current.note}
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
                    <span className="material-symbols-outlined text-[30px]">close</span>
                  </button>
                  <button
                    onClick={() => onDecision("accept")}
                    disabled={
                      current.kind === "post" &&
                      !current.requestId &&
                      Number(current.seatsAvailable || 0) < Number(requestedSeats)
                    }
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fd9d1a] text-[#2e2200] shadow-[0_14px_30px_rgba(253,157,26,0.35)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
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
            ) : isLoading ? (
              <LoadingPanel label="Searching companions..." className="rounded-2xl" />
            ) : (
              <div className="rounded-2xl bg-surface-container-low p-8 text-center">
                <span className="material-symbols-outlined text-2xl text-[#6f736b]">
                  travel_explore
                </span>
                <p className="mt-3 font-semibold text-[#2a322d]">
                  No companions found for this route
                </p>
                <p className="mt-1 text-sm text-[#6f736b]">
                  Try a broader date range, fewer seats, or remove a preference filter.
                </p>
                <button
                  type="button"
                  onClick={resetSearchFilters}
                  className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                >
                  Reset filters
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <article className="rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <h2 className="font-headline text-lg font-bold text-[#202925]">
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
                  value={postSeatsAvailable}
                  onChange={(event) => setPostSeatsAvailable(Number(event.target.value))}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <option value={1}>1 seat available</option>
                  <option value={2}>2 seats available</option>
                  <option value={3}>3 seats available</option>
                  <option value={4}>4 seats available</option>
                </select>
                <select
                  value={postGenderPreference}
                  onChange={(event) => setPostGenderPreference(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <option value="Any">Any gender</option>
                  <option value="F">Female only</option>
                  <option value="M">Male only</option>
                </select>
                <select
                  value={postVehicleType}
                  onChange={(event) => setPostVehicleType(event.target.value)}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any vehicle</option>
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
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

            <article className="rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-[#202925]">
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
                        {formatTravelDate(item.travelDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5e665f]">
                        <span className="rounded-full bg-[#f5f1e9] px-2 py-1">
                          {Number(item.seatsAvailable || 0)}/{Number(item.maxCompanions || 0)} seats left
                        </span>
                        <span className="rounded-full bg-[#f5f1e9] px-2 py-1">
                          {item.genderPreference === "Any"
                            ? "Any gender"
                            : `${item.genderPreference} preference`}
                        </span>
                        <span className="rounded-full bg-[#f5f1e9] px-2 py-1">
                          {item.vehicleType || "Any vehicle"}
                        </span>
                      </div>
                      {item.note ? (
                        <p className="mt-2 text-xs text-[#6e736a]">{item.note}</p>
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

      {loggedIn ? (
        <button
          type="button"
          onClick={() => {
            setInboxTab("requests");
            setIsInboxOpen(true);
          }}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-3 rounded-full bg-[#103f2f] px-5 py-3 text-white shadow-[0_18px_40px_rgba(16,63,47,0.28)]"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-sm font-bold">Inbox</span>
          <span className="rounded-full bg-[#fd9d1a] px-2 py-0.5 text-xs font-black text-[#2b2100]">
            {inboxCount}
          </span>
        </button>
      ) : null}

      {isInboxOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close inbox"
            onClick={() => setIsInboxOpen(false)}
            className="absolute inset-0 bg-[#101816]/45 backdrop-blur-[1px]"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-hidden bg-[#f7f4ed] shadow-[0_24px_60px_rgba(16,24,22,0.22)]">
            <div className="flex h-full flex-col">
              <div className="border-b border-[#e4ddd0] bg-white px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5b18]">
                      Requests & Updates
                    </p>
                    <h2 className="mt-1 font-headline text-xl font-extrabold text-[#173228]">
                      Companion Inbox
                    </h2>
                    <p className="mt-1 text-sm text-[#667068]">
                      Handle requests without scrolling through the whole page.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsInboxOpen(false)}
                    className="rounded-full bg-[#f1eee7] p-2 text-[#173228]"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInboxTab("requests")}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                      inboxTab === "requests"
                        ? "bg-[#173f31] text-white"
                        : "bg-[#ece7dd] text-[#516059]"
                    }`}
                  >
                    Requests {requestRows.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInboxTab("notifications")}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                      inboxTab === "notifications"
                        ? "bg-[#173f31] text-white"
                        : "bg-[#ece7dd] text-[#516059]"
                    }`}
                  >
                    Notifications {unreadNotificationCount}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {inboxTab === "requests" ? (
                  <div className="space-y-3">
                    {requestRows.length ? (
                      requestRows.map((item) => (
                        <article
                          key={item.key}
                          className={`rounded-[24px] border bg-white p-4 shadow-sm ${
                            item.direction === "incoming" && item.status === "pending"
                              ? "border-[#ffb24a]"
                              : "border-[#ece4d8]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-headline text-lg font-bold text-[#20322b]">
                                {item.name}
                              </p>
                              <p className="mt-1 text-sm text-[#798078]">{item.route}</p>
                              <p className="text-sm text-[#798078]">{item.dateLabel}</p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                                item.status === "accepted"
                                  ? "bg-[#ffe7b7] text-[#a66900]"
                                  : item.status === "pending"
                                    ? "bg-[#fff1d6] text-[#9d6700]"
                                    : "bg-[#f8d6db] text-[#b44f59]"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8f87]">
                            {item.requestType === "personal_trip_post"
                              ? "Personal Trip Post"
                              : "Booking Match"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5e665f]">
                            <span className="rounded-full bg-[#f5f1e9] px-3 py-1">
                              {item.seatsRequested} seat{item.seatsRequested > 1 ? "s" : ""}
                            </span>
                            <span className="rounded-full bg-[#f5f1e9] px-3 py-1">
                              {item.genderPreference === "Any"
                                ? "Any gender"
                                : `${item.genderPreference} preference`}
                            </span>
                            <span className="rounded-full bg-[#f5f1e9] px-3 py-1">
                              {item.vehicleType || "Any vehicle"}
                            </span>
                          </div>

                          <p className="mt-3 text-xs text-[#7a7f79]">{item.createdLabel}</p>

                          {item.direction === "incoming" && item.status === "pending" ? (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => respondFromInbox(item.requestId, "accepted")}
                                className="rounded-xl bg-[#275f49] py-3 text-xs font-bold uppercase tracking-[0.12em] text-white"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => respondFromInbox(item.requestId, "declined")}
                                className="rounded-xl bg-[#c14f5f] py-3 text-xs font-bold uppercase tracking-[0.12em] text-white"
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}

                          {item.isChatEnabled ? (
                            <Link
                              to={
                                item.chatRoomId
                                  ? `/chat?roomId=${encodeURIComponent(item.chatRoomId)}`
                                  : "/chat"
                              }
                              className="mt-4 block rounded-xl bg-[#275f49] py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white"
                            >
                              Start Chat
                            </Link>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[24px] bg-white p-8 text-center shadow-sm">
                        <span className="material-symbols-outlined text-2xl text-[#71766e]">
                          notifications_none
                        </span>
                        <p className="mt-3 font-semibold text-[#2a322d]">
                          No requests right now
                        </p>
                        <p className="mt-1 text-sm text-[#6f736b]">
                          New companion activity will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.length ? (
                      notifications.map((notification) => (
                        <article
                          key={notification._id}
                          className={`rounded-[24px] border p-4 shadow-sm ${
                            notification.isRead
                              ? "border-[#ece4d8] bg-white"
                              : "border-[#c9e5d8] bg-[#edf9f1]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#20322b]">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-xs text-[#6f736b]">
                                {formatDateTime(notification.createdAt)}
                              </p>
                            </div>

                            {!notification.isRead ? (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(notification._id)}
                                className="rounded-full bg-[#173f31] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                              >
                                Mark read
                              </button>
                            ) : (
                              <span className="rounded-full bg-[#ece7dd] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#768078]">
                                Read
                              </span>
                            )}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[24px] bg-white p-8 text-center shadow-sm">
                        <span className="material-symbols-outlined text-2xl text-[#71766e]">
                          inbox
                        </span>
                        <p className="mt-3 font-semibold text-[#2a322d]">
                          No notifications yet
                        </p>
                        <p className="mt-1 text-sm text-[#6f736b]">
                          Accepted, declined, and companion updates will show here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </MainLayout>
  );
}
