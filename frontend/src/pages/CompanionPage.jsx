import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import CityAutocompleteInput from "../components/ui/CityAutocompleteInput";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";

const formatTravelDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date flexible";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

const getScoreBadge = (score) => `${Math.round(Number(score || 0))}% Fit`;
const formatCurrency = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? `Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "N/A";

const getRequestPriority = (item) => {
  if (item.direction === "incoming" && item.status === "pending") return 0;
  if (item.status === "accepted") return 1;
  if (item.direction === "outgoing" && item.status === "pending") return 2;
  return 3;
};

export default function CompanionPage() {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const loggedIn = Boolean(token);
  const navigate = useNavigate();

  // Active Tab Logic (Dashboard style)
  const [activeTab, setActiveTab] = useState("discover");

  // Search State
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [searchGenderPreference, setSearchGenderPreference] = useState("Any");
  const [searchVehicleType, setSearchVehicleType] = useState("");

  // Post State
  const [postSource, setPostSource] = useState("");
  const [postDestination, setPostDestination] = useState("");
  const [postTravelDate, setPostTravelDate] = useState("");
  const [postSeatsAvailable, setPostSeatsAvailable] = useState("");
  const [postGenderPreference, setPostGenderPreference] = useState("");
  const [postVehicleType, setPostVehicleType] = useState("");
  const [postNote, setPostNote] = useState("");
  const [postFuelPricePerLitre, setPostFuelPricePerLitre] = useState("");
  const [postMileage, setPostMileage] = useState("");
  const [postTollAmount, setPostTollAmount] = useState("");
  const [postSourceCoordinates, setPostSourceCoordinates] = useState(null);
  const [postDestinationCoordinates, setPostDestinationCoordinates] = useState(null);
  const [routeCalcProgress, setRouteCalcProgress] = useState(0);
  const [isRoutePreviewVisible, setIsRoutePreviewVisible] = useState(false);

  // Data State
  const [matches, setMatches] = useState([]);
  const [personalPosts, setPersonalPosts] = useState([]);
  const [myPersonalPosts, setMyPersonalPosts] = useState([]);
  const [myRequests, setMyRequests] = useState({ sent: [], received: [] });
  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pageError, setPageError] = useState("");
  const routeProgressTimerRef = useRef(null);
  const routePreviewHideTimerRef = useRef(null);

  const clearRouteAnimationTimers = () => {
    if (routeProgressTimerRef.current) {
      clearInterval(routeProgressTimerRef.current);
      routeProgressTimerRef.current = null;
    }
    if (routePreviewHideTimerRef.current) {
      clearTimeout(routePreviewHideTimerRef.current);
      routePreviewHideTimerRef.current = null;
    }
  };

  const startRouteAnimation = () => {
    clearRouteAnimationTimers();
    setIsRoutePreviewVisible(true);
    setRouteCalcProgress(6);
    routeProgressTimerRef.current = setInterval(() => {
      setRouteCalcProgress((current) => {
        if (current >= 92) return 92;
        return Math.min(92, current + Math.max(2, (92 - current) * 0.16));
      });
    }, 140);
  };

  const finishRouteAnimation = (didSucceed) => {
    clearRouteAnimationTimers();
    if (!didSucceed) {
      setRouteCalcProgress(0);
      setIsRoutePreviewVisible(false);
      return;
    }
    setRouteCalcProgress(100);
    routePreviewHideTimerRef.current = setTimeout(() => {
      setIsRoutePreviewVisible(false);
      setRouteCalcProgress(0);
      routePreviewHideTimerRef.current = null;
    }, 900);
  };

  useEffect(() => () => clearRouteAnimationTimers(), []);

  const buildSearchQuery = (overrides = {}) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "50",
      seatsRequested: String(overrides.requestedSeats ?? requestedSeats),
    });

    const resolvedSource = String(overrides.source ?? source ?? "").trim();
    const resolvedDestination = String(
      overrides.destination ?? destination ?? "",
    ).trim();
    const resolvedTravelDate = String(
      overrides.travelDate ?? travelDate ?? "",
    ).trim();

    if (resolvedSource) params.set("source", resolvedSource);
    if (resolvedDestination) params.set("destination", resolvedDestination);
    if (resolvedTravelDate) params.set("date", resolvedTravelDate);

    const genderPreference =
      overrides.searchGenderPreference ?? searchGenderPreference;
    if (genderPreference && genderPreference !== "Any")
      params.set("genderPreference", genderPreference);

    const vehicleType = overrides.searchVehicleType ?? searchVehicleType;
    if (vehicleType) params.set("vehicleType", vehicleType);

    return params.toString();
  };

  const loadCompanionData = async (overrides = {}) => {
    if (!loggedIn) return;

    try {
      setIsLoading(true);
      setPageError("");

      const searchQuery = buildSearchQuery(overrides);
      const bookingParams = new URLSearchParams({
        page: "1",
        limit: "50",
      });
      const bookingSource = String(overrides.source ?? source ?? "").trim();
      const bookingDestination = String(
        overrides.destination ?? destination ?? "",
      ).trim();
      const bookingDate = String(
        overrides.travelDate ?? travelDate ?? "",
        overrides.travelDate ?? travelDate ?? "").trim();
      if (bookingSource) bookingParams.set("source", bookingSource);
      if (bookingDestination)
        bookingParams.set("destination", bookingDestination);
      if (bookingDate) bookingParams.set("date", bookingDate);
      const bookingQuery = bookingParams.toString();

      const [foundMatches, requests, foundPosts, minePosts, userNotifications, userBookings] =
        await Promise.all([
          api.get(`/companions/find?${bookingQuery}`, { forceRefresh: true }),
          api.get("/companions/my?page=1&limit=50", { cacheTtlMs: 15000 }),
          api.get(`/companions/search?${searchQuery}`, { forceRefresh: true }),
          api.get("/companions/posts/mine?page=1&limit=50"),
          api.get("/notifications?page=1&limit=25", { cacheTtlMs: 10000 }),
          api.get("/bookings/my?page=1&limit=50"),
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
      setNotifications(
        Array.isArray(userNotifications?.items) ? userNotifications.items : [],
      );
      setBookings(
        Array.isArray(userBookings?.items) ? userBookings.items : [],
      );
    } catch (fetchError) {
      setPageError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanionData();
  }, [loggedIn]);

  const resetSearchFilters = async () => {
    setSource("");
    setDestination("");
    setTravelDate("");
    setRequestedSeats(1);
    setSearchGenderPreference("Any");
    setSearchVehicleType("");
    await loadCompanionData({
      source: "",
      destination: "",
      travelDate: "",
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
      route: `${item.source} ➔ ${item.destination}`,
      dates: formatTravelDate(item.travelDate),
      matchLabel: item.matchLabel || "Route Match",
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
      distanceKm: null,
      estimatedFuelCost: null,
      estimatedCostPerPerson: null,
      note: "Matched via active BagPacker booking.",
      postId: null,
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80",
    }));

    const postItems = (personalPosts || []).map((item) => ({
      kind: "post",
      id: `post-${item.postId}`,
      userId: item.ownerId,
      requestId: item.request?.id || null,
      requestStatus: item.request?.status || null,
      requestDirection: item.request?.direction || null,
      name: item.ownerName || "Traveler",
      route: `${item.source} ➔ ${item.destination}`,
      dates: formatTravelDate(item.travelDate),
      matchLabel: item.matchLabel || "Route Match",
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
      distanceKm: typeof item.distanceKm === "number" ? item.distanceKm : null,
      estimatedFuelCost:
        typeof item.estimatedFuelCost === "number"
          ? item.estimatedFuelCost
          : null,
      estimatedCostPerPerson:
        typeof item.estimatedCostPerPerson === "number"
          ? item.estimatedCostPerPerson
          : null,
      note: item.note || "Open personal expedition post.",
      postId: item.postId,
      image:
        "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=400&q=80",
    }));

    return [...postItems, ...bookingItems].sort((first, second) => {
      const p1 =
        first.requestStatus === "pending" &&
        first.requestDirection === "incoming"
          ? 0
          : 1;
      const p2 =
        second.requestStatus === "pending" &&
        second.requestDirection === "incoming"
          ? 0
          : 1;
      if (p1 !== p2) return p1 - p2;
      return Number(second.score || 0) - Number(first.score || 0);
    });
  }, [matches, personalPosts]);

  const requestRows = useMemo(() => {
    const sentRows = (myRequests.sent || []).map((item) => ({
      key: `sent-${item._id}`,
      requestId: item._id,
      name: item.receiverId?.name || "Traveler",
      route: `${item.source} ➔ ${item.destination}`,
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
      route: `${item.source} ➔ ${item.destination}`,
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
      const priorityDelta =
        getRequestPriority(first) - getRequestPriority(second);
      if (priorityDelta !== 0) return priorityDelta;
      return second.createdLabel.localeCompare(first.createdLabel);
    });
  }, [myRequests]);

  const unreadNotificationCount = notifications.filter((i) => !i.isRead).length;

  const markNotificationRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((i) =>
          i._id === notificationId ? { ...i, isRead: true } : i,
        ),
      );
    } catch (err) {
      showErrorAlert("Update failed", err.message);
    }
  };

  const onDecision = async (item, type) => {
    try {
      const isPost = item.kind === "post";
      const isIncomingPending =
        item.requestStatus === "pending" &&
        item.requestDirection === "incoming";
      const isAccepted = item.requestStatus === "accepted";

      if (type === "accept") {
        if (isAccepted) {
          navigate(
            item.chatRoomId
              ? `/chat?roomId=${encodeURIComponent(item.chatRoomId)}`
              : "/chat",
          );
          return;
        }
        if (isIncomingPending) {
          await api.patch(`/companions/${item.requestId}/accept`, {});
          await loadCompanionData();
          await showSuccessAlert(
            "Matched!",
            "Your chat is now available in your inbox.",
          );
          return;
        }

        await api.post(
          "/companions",
          isPost
            ? {
                personalTripPostId: item.postId,
                seatsRequested: Number(requestedSeats),
                genderPreference: searchGenderPreference,
                ...(searchVehicleType
                  ? { vehicleType: searchVehicleType }
                  : {}),
              }
            : {
                receiverId: item.userId,
                source: item.source,
                destination: item.destination,
                travelDate: item.travelDate || travelDate,
                seatsRequested: Number(requestedSeats),
                genderPreference: searchGenderPreference,
                ...(searchVehicleType
                  ? { vehicleType: searchVehicleType }
                  : {}),
              },
        );

        await loadCompanionData();
        await showSuccessAlert(
          "Request Sent",
          "We'll notify you once they respond.",
        );
        return;
      }

      if (isIncomingPending) {
        await api.patch(`/companions/${item.requestId}/decline`, {});
        await loadCompanionData();
        return;
      }
    } catch (err) {
      showErrorAlert("Action failed", err.message);
    }
  };

  const createPersonalTripPost = async () => {
    if (!loggedIn) return;
    const normalizedSource = String(postSource || "").trim();
    const normalizedDestination = String(postDestination || "").trim();
    const seatsValue = Number(postSeatsAvailable);

    if (!normalizedSource || !normalizedDestination || !postTravelDate || !Number.isInteger(seatsValue) || seatsValue < 1) {
      showErrorAlert(
        "Missing details",
        "Please provide source, destination, date, and seats before launching.",
      );
      return;
    }
    const hasExactCoordinates =
      postSourceCoordinates &&
      postDestinationCoordinates &&
      Number.isFinite(postSourceCoordinates.latitude) &&
      Number.isFinite(postSourceCoordinates.longitude) &&
      Number.isFinite(postDestinationCoordinates.latitude) &&
      Number.isFinite(postDestinationCoordinates.longitude);

    if (!hasExactCoordinates) {
      showErrorAlert(
        "Select from suggestions",
        "Please pick both source and destination from the suggestion list.",
      );
      return;
    }

    let didSucceed = false;
    try {
      setIsPosting(true);
      startRouteAnimation();
      await api.post("/companions/posts", {
        source: normalizedSource,
        destination: normalizedDestination,
        travelDate: postTravelDate,
        seatsAvailable: seatsValue,
        genderPreference: postGenderPreference,
        sourceLatitude: postSourceCoordinates.latitude,
        sourceLongitude: postSourceCoordinates.longitude,
        destinationLatitude: postDestinationCoordinates.latitude,
        destinationLongitude: postDestinationCoordinates.longitude,
        ...(postVehicleType ? { vehicleType: postVehicleType } : {}),
        ...(postFuelPricePerLitre !== ""
          ? { fuelPricePerLitre: Number(postFuelPricePerLitre) }
          : {}),
        ...(postMileage !== "" ? { mileage: Number(postMileage) } : {}),
        ...(postTollAmount !== ""
          ? { tollAmount: Number(postTollAmount) }
          : {}),
        note: postNote,
      });
      didSucceed = true;
      setPostNote("");
      await loadCompanionData();
      await showSuccessAlert(
        "Post Live",
        "Your expedition is now visible to others.",
      );
      setActiveTab("my_posts");
    } catch (err) {
      showErrorAlert("Failed to post", err.message);
    } finally {
      finishRouteAnimation(didSucceed);
      setIsPosting(false);
    }
  };

  const respondFromInbox = async (requestId, status) => {
    try {
      await api.patch(
        `/companions/${requestId}/${status === "accepted" ? "accept" : "decline"}`,
        {},
      );
      await showSuccessAlert(
        status === "accepted" ? "Accepted" : "Declined",
        "Updated successfully.",
      );
      await loadCompanionData();
    } catch (err) {
      showErrorAlert("Update failed", err.message);
    }
  };

  return (
    <MainLayout hideFooterOnMobile={true}>
      <div className="flex min-h-[calc(100vh-64px)] bg-surface-container-lowest">
        {/* ── Dashboard Sidebar ── */}
        <aside className="hidden w-72 flex-col border-r border-outline-variant/10 bg-surface-container-low md:flex">
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[1.2rem]">
                  groups
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-headline text-[13px] font-black uppercase tracking-[0.15em] text-on-surface">
                  Explorer <span className="text-primary">Hub</span>
                </h2>
                <p className="truncate text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                  BagPacker Network
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 pt-4">
            {[
              ["discover", "Discover", "explore", 0],
              ["bookings", "My Bookings", "event_note", bookings.length],
              ["requests", "Requests", "group", requestRows.filter(r => r.status === 'pending' && r.direction === 'incoming').length],
              ["my_posts", "My Posts", "rocket_launch", 0],
              ["notifications", "Updates", "notifications", unreadNotificationCount],
              ["create", "Launch Expedition", "add_circle", 0],
            ].map(([key, label, icon, count]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  activeTab === key
                    ? "bg-primary text-on-primary shadow-[0_8px_16px_rgba(1,45,29,0.15)]"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="material-symbols-outlined text-[1.2rem]">
                    {icon}
                  </span>
                  {label}
                </div>
                {count > 0 && (
                  <span className={`h-4 w-4 rounded-full text-[8px] flex items-center justify-center ${activeTab === key ? "bg-on-primary text-primary" : "bg-secondary text-on-secondary"}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mx-6 mb-8 rounded-2xl bg-surface-container-high/50 p-4 border border-outline-variant/30 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3">
              Your Trust Score
            </p>
            <p className="font-headline text-3xl font-black text-secondary">
              {user?.trustScore || 0}
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-secondary transition-all"
                style={{ width: `${Math.min(100, user?.trustScore || 0)}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface/80 backdrop-blur-xl md:hidden">
          <nav className="flex items-center justify-around px-2 py-3">
            {[
              ["discover", "explore", "Discover", 0],
              ["bookings", "event_note", "Bookings", bookings.length],
              ["requests", "group", "Requests", requestRows.filter(r => r.status === 'pending' && r.direction === 'incoming').length],
              ["my_posts", "rocket_launch", "Posts", 0],
              ["create", "add_circle", "Launch", 0],
            ].map(([key, icon, label, count]) => (
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
                {count > 0 && (
                  <span className="absolute top-0 right-0 -mr-1 h-3.5 w-3.5 rounded-full bg-secondary text-[7px] flex items-center justify-center text-on-secondary font-black">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Main content area ── */}
        <main className="flex-1 overflow-y-auto px-6 py-10 pb-24 md:px-12 md:pb-10">
          <div className="mx-auto max-w-6xl space-y-10">
            {/* Context Header */}
            <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tighter text-on-surface capitalize">
                  {activeTab.replace("_", " ")}{" "}
                  <span className="text-secondary">Console</span>
                </h1>
                <p className="mt-1 text-[11px] sm:text-sm font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">
                  {activeTab === "discover" &&
                    "Find travel companions near your route"}
                  {activeTab === "bookings" &&
                    "Manage your confirmed travel reservations"}
                  {activeTab === "requests" &&
                    "Manage incoming and outgoing requests"}
                  {activeTab === "my_posts" &&
                    "Track your personal travel expeditions"}
                  {activeTab === "notifications" &&
                    "Recent activity in your network"}
                  {activeTab === "create" &&
                    "Invite others to join your journey"}
                </p>
              </div>

              {activeTab === "discover" && (
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-xs text-primary shrink-0">
                      trip_origin
                    </span>
                    <CityAutocompleteInput
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="bg-transparent text-[11px] font-black outline-none w-full uppercase"
                      placeholder="Source"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-xs text-secondary shrink-0">
                      near_me
                    </span>
                    <CityAutocompleteInput
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="bg-transparent text-[11px] font-black outline-none w-full uppercase"
                      placeholder="Dest"
                    />
                  </div>
                  <button
                    onClick={() => loadCompanionData()}
                    className="col-span-2 sm:col-auto h-9 w-full sm:w-9 flex items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/10"
                  >
                    <span className="material-symbols-outlined text-sm">
                      refresh
                    </span>
                  </button>
                </div>
              )}
            </header>

            {loggedIn && pageError && (
              <div className="rounded-2xl border border-error/20 bg-error-container/30 px-4 py-3 text-xs font-bold text-error">
                {pageError}
              </div>
            )}

            {!loggedIn && (
              <div className="rounded-3xl bg-error-container p-10 text-center border border-error/10">
                <span className="material-symbols-outlined text-4xl text-error mb-4">
                  lock_person
                </span>
                <h3 className="text-xl font-black text-error">
                  Authentication Required
                </h3>
                <p className="mt-2 text-sm font-medium text-error/60">
                  Please login to access the companion discovery network.
                </p>
                <Link
                  to="/auth"
                  className="mt-8 inline-block rounded-full bg-error px-10 py-3 text-[10px] font-black uppercase tracking-widest text-on-error"
                >
                  Authenticate Now
                </Link>
              </div>
            )}

            {loggedIn && (
              <div className="space-y-10">
                {/* ── Discover Tab ── */}
                {activeTab === "discover" && (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {discoverItems.map((item) => (
                      <article
                        key={item.id}
                        className="group overflow-hidden rounded-[2.5rem] border border-outline-variant/10 bg-surface transition-all hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="relative aspect-[3/2] sm:aspect-[5/4] overflow-hidden bg-surface-container-high">
                          <img
                            src={item.image}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                            alt={item.name}
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-on-surface/60 to-transparent" />
                          <div className="absolute left-4 top-4 flex gap-2">
                            <span className="rounded-lg bg-white/20 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                              {getScoreBadge(item.score)}
                            </span>
                            <span
                              className={`rounded-lg px-3 py-1 text-[8px] font-black uppercase tracking-widest backdrop-blur-md ${item.verificationStatus === "verified" ? "bg-primary/20 text-white" : "bg-surface-container/20 text-white/60"}`}
                            >
                              {item.verificationStatus}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 sm:p-6">
                          <div className="flex items-center justify-between">
                            <h4 className="truncate font-headline text-lg font-black text-on-surface">
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-1 text-secondary shrink-0">
                              <span className="material-symbols-outlined text-xs">
                                verified
                              </span>
                              <span className="text-[10px] font-black">
                                {item.trust}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 truncate text-[9px] sm:text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                            {item.route}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-surface-container px-2 py-1 text-[8px] sm:text-[9px] font-bold text-on-surface-variant">
                              {item.dates}
                            </span>
                            <span
                              className={`rounded-lg px-2 py-1 text-[8px] sm:text-[9px] font-bold text-on-surface-variant ${item.kind === "post" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}
                            >
                              {item.kind === "post"
                                ? "Trip Post"
                                : "Booking Match"}
                            </span>
                          </div>
                          {item.kind === "post" && (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                  Distance
                                </p>
                                <p className="mt-1 text-[10px] font-black text-on-surface">
                                  {typeof item.distanceKm === "number"
                                    ? `${item.distanceKm} km`
                                    : "N/A"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                  Fuel
                                </p>
                                <p className="mt-1 text-[10px] font-black text-on-surface">
                                  {formatCurrency(item.estimatedFuelCost)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                  Per Person
                                </p>
                                <p className="mt-1 text-[10px] font-black text-secondary">
                                  {formatCurrency(item.estimatedCostPerPerson)}
                                </p>
                              </div>
                            </div>
                          )}
                          <p className="mt-4 text-xs font-medium text-on-surface-variant line-clamp-2 italic leading-relaxed">
                            "{item.note}"
                          </p>
                          <div className="mt-8 flex gap-3">
                            <button
                              onClick={() => onDecision(item, "accept")}
                              className="flex-1 rounded-xl bg-primary py-3 text-[9px] font-black uppercase tracking-widest text-on-primary shadow-lg shadow-primary/10 transition active:scale-95"
                            >
                              Connect
                            </button>
                            <button
                              onClick={() => onDecision(item, "decline")}
                              className="flex h-9 w-9 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:text-error transition"
                            >
                              <span className="material-symbols-outlined text-sm">
                                close
                              </span>
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {discoverItems.length === 0 && !isLoading && (
                      <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-outline-variant/30 bg-surface-container-low/30 text-center">
                        <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">
                          No active travelers on this route
                        </p>
                      </div>
                    )}
                    {isLoading && (
                      <div className="col-span-full">
                        <LoadingPanel
                          label="Scanning Network..."
                          variant="list"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Bookings Tab ── */}
                {activeTab === "bookings" && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      {bookings.map((booking) => (
                        <article
                          key={booking._id}
                          className="rounded-3xl border border-outline-variant/10 bg-surface p-5 sm:p-8 transition hover:shadow-md"
                        >
                          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="truncate font-headline text-lg sm:text-xl font-black text-on-surface">
                                  {booking.tripId?.title}
                                </h4>
                                <span className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                                  booking.status === "confirmed"
                                    ? "bg-success-container text-on-success-container"
                                    : "bg-warning-container text-on-warning-container"
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                              <p className="mt-2 text-xs sm:text-sm font-bold text-on-surface-variant">
                                {booking.tripId?.source} ➔ {booking.tripId?.destination}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                                  {formatTravelDate(booking.tripId?.startDate)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">group</span>
                                  {booking.seatsBooked} Seats
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 md:border-none md:pt-0 md:text-right">
                              <div className="md:hidden">
                                <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase">Amount</p>
                                <p className="font-headline text-lg font-black text-primary">
                                  {formatCurrency(booking.totalAmount)}
                                </p>
                              </div>
                              <div className="hidden md:block">
                                <p className="font-headline text-2xl font-black text-primary">
                                  {formatCurrency(booking.totalAmount)}
                                </p>
                                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase mt-1">Confirmed</p>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                      {bookings.length === 0 && (
                        <div className="py-20 text-center rounded-[2.5rem] bg-surface-container-low/30">
                          <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">
                            No active bookings
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Requests Tab ── */}
                {activeTab === "requests" && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      {requestRows.map((item) => (
                        <article
                          key={item.key}
                          className="rounded-3xl border border-outline-variant/10 bg-surface p-5 sm:p-8 transition hover:shadow-md"
                        >
                          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="truncate font-headline text-lg sm:text-xl font-black text-on-surface">
                                  {item.name}
                                </h4>
                                <span
                                  className={`rounded-lg px-3 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${item.status === "accepted" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[9px] sm:text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">
                                {item.route}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[0.8rem]">
                                    calendar_today
                                  </span>
                                  {item.dateLabel}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[0.8rem]">
                                    group
                                  </span>
                                  {item.seatsRequested} Seat
                                  {item.seatsRequested > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/10 pt-4 md:border-none md:pt-0">
                              {item.direction === "incoming" &&
                              item.status === "pending" ? (
                                <>
                                  <button
                                    onClick={() =>
                                      respondFromInbox(
                                        item.requestId,
                                        "accepted",
                                      )
                                    }
                                    className="flex-1 md:flex-none rounded-xl bg-primary px-8 py-3 text-[9px] font-black uppercase tracking-widest text-on-primary"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      respondFromInbox(
                                        item.requestId,
                                        "declined",
                                      )
                                    }
                                    className="flex-1 md:flex-none rounded-xl bg-surface-container-high px-8 py-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant"
                                  >
                                    Ignore
                                  </button>
                                </>
                              ) : item.isChatEnabled ? (
                                <Link
                                  to={
                                    item.chatRoomId
                                      ? `/chat?roomId=${encodeURIComponent(item.chatRoomId)}`
                                      : "/chat"
                                  }
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-secondary px-8 py-3 text-[9px] font-black uppercase tracking-widest text-on-secondary"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    chat
                                  </span>{" "}
                                  Message
                                </Link>
                              ) : (
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 italic">
                                  Waiting for response
                                </p>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                      {requestRows.length === 0 && (
                        <div className="py-20 text-center rounded-[2.5rem] bg-surface-container-low/30">
                          <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">
                            No active requests
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── My Posts Tab ── */}
                {activeTab === "my_posts" && (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {myPersonalPosts.map((item) => (
                      <article
                        key={item._id}
                        className="rounded-[2.5rem] border border-outline-variant/10 bg-surface p-8 shadow-sm transition hover:shadow-xl"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                            <span className="material-symbols-outlined text-xl">
                              rocket
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                              Status
                            </p>
                            <p className="text-sm font-black text-on-surface">
                              {item.seatsAvailable} Free
                            </p>
                          </div>
                        </div>
                        <h4 className="font-headline text-lg font-black text-on-surface">
                          {item.source} ➔ {item.destination}
                        </h4>
                        <p className="mt-2 text-[10px] font-bold text-secondary uppercase tracking-widest">
                          {formatTravelDate(item.travelDate)}
                        </p>
                        <div className="mt-8 pt-8 border-t border-outline-variant/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-3">
                            Preferences
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-surface-container-low px-3 py-1.5 text-[9px] font-black text-on-surface-variant/80 uppercase">
                              {item.genderPreference} Only
                            </span>
                            <span className="rounded-lg bg-surface-container-low px-3 py-1.5 text-[9px] font-black text-on-surface-variant/80 uppercase">
                              {item.vehicleType || "Open"}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                Distance
                              </p>
                              <p className="mt-1 text-[10px] font-black text-on-surface">
                                {typeof item.distanceKm === "number"
                                  ? `${item.distanceKm} km`
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                Fuel
                              </p>
                              <p className="mt-1 text-[10px] font-black text-on-surface">
                                {formatCurrency(item.estimatedFuelCost)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-surface-container-low px-2 py-2 text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/50">
                                Per Person
                              </p>
                              <p className="mt-1 text-[10px] font-black text-secondary">
                                {formatCurrency(item.estimatedCostPerPerson)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    {myPersonalPosts.length === 0 && (
                      <div className="col-span-full py-20 text-center rounded-[2.5rem] bg-surface-container-low/30 border border-dashed border-outline-variant/30">
                        <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">
                          You haven't launched any expeditions yet
                        </p>
                        <button
                          onClick={() => setActiveTab("create")}
                          className="mt-6 text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary pb-0.5"
                        >
                          Start Now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Notifications Tab ── */}
                {activeTab === "notifications" && (
                  <section className="rounded-3xl border border-outline-variant/10 bg-surface overflow-hidden shadow-sm">
                    <div className="divide-y divide-outline-variant/5">
                      {notifications.map((n) => (
                        <article
                          key={n._id}
                          className={`flex items-center gap-6 px-8 py-6 transition hover:bg-surface-container-lowest ${n.isRead ? "opacity-60" : "bg-primary/5"}`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full shrink-0 ${n.isRead ? "bg-outline-variant" : "bg-secondary animate-pulse"}`}
                          />
                          <p className="flex-1 text-sm font-bold text-on-surface">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-6">
                            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase whitespace-nowrap">
                              {formatDateTime(n.createdAt)}
                            </p>
                            {!n.isRead && (
                              <button
                                onClick={() => markNotificationRead(n._id)}
                                className="text-[9px] font-black uppercase tracking-widest text-primary border-b border-primary"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                      {notifications.length === 0 && (
                        <div className="py-20 text-center">
                          <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">
                            Everything is up to date
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* ── Create Tab ── */}
                {activeTab === "create" && (
                  <div className="mx-auto max-w-2xl rounded-[2rem] sm:rounded-[3rem] bg-surface p-6 sm:p-12 shadow-2xl border border-outline-variant/10">
                    <div className="mb-10 text-center">
                      <div className="mx-auto mb-6 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">
                          add_location_alt
                        </span>
                      </div>
                      <h3 className="font-headline text-xl sm:text-2xl font-black text-on-surface">
                        Launch New Expedition
                      </h3>
                      <p className="mt-2 text-[10px] sm:text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
                        Recruit companions for your journey
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Departure
                          </p>
                          <CityAutocompleteInput
                            value={postSource}
                            onChange={(e) => setPostSource(e.target.value)}
                            onSelect={(item) =>
                              setPostSourceCoordinates(
                                item &&
                                  Number.isFinite(Number(item.latitude)) &&
                                  Number.isFinite(Number(item.longitude))
                                  ? {
                                      latitude: Number(item.latitude),
                                      longitude: Number(item.longitude),
                                    }
                                  : null,
                              )
                            }
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10 focus:border-primary/40 transition"
                            placeholder="Source City"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Arrival
                          </p>
                          <CityAutocompleteInput
                            value={postDestination}
                            onChange={(e) => setPostDestination(e.target.value)}
                            onSelect={(item) =>
                              setPostDestinationCoordinates(
                                item &&
                                  Number.isFinite(Number(item.latitude)) &&
                                  Number.isFinite(Number(item.longitude))
                                  ? {
                                      latitude: Number(item.latitude),
                                      longitude: Number(item.longitude),
                                    }
                                  : null,
                              )
                            }
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10 focus:border-primary/40 transition"
                            placeholder="Destination City"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Timeline
                          </p>
                          <input
                            type="date"
                            value={postTravelDate}
                            onChange={(e) => setPostTravelDate(e.target.value)}
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Capacity
                          </p>
                          <select
                            value={postSeatsAvailable}
                            onChange={(e) =>
                              setPostSeatsAvailable(e.target.value)
                            }
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10"
                          >
                            <option value="" disabled>
                              Select seats
                            </option>
                            {[1, 2, 3, 4, 5, 6].map((v) => (
                              <option key={v} value={v}>
                                {v} Travelers
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Inclusion
                          </p>
                          <select
                            value={postGenderPreference}
                            onChange={(e) =>
                              setPostGenderPreference(e.target.value)
                            }
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10"
                          >
                            <option value="" disabled>
                              Select preference
                            </option>
                            <option value="Any">Any Gender</option>
                            <option value="F">Female Only</option>
                            <option value="M">Male Only</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                            Transit Mode
                          </p>
                          <select
                            value={postVehicleType}
                            onChange={(e) => setPostVehicleType(e.target.value)}
                            className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10"
                          >
                            <option value="">Any Vehicle</option>
                            <option value="car">Car</option>
                            <option value="bike">Bike</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-2">
                          Briefing
                        </p>
                        <textarea
                          value={postNote}
                          onChange={(e) => setPostNote(e.target.value)}
                          className="w-full rounded-2xl bg-surface-container-low p-4 text-xs font-black outline-none border border-outline-variant/10 h-32 resize-none"
                          placeholder="Expedition details, route perks, or vibes..."
                        />
                      </div>

                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/40 p-5 space-y-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">
                          Expense Estimation (Optional, based on Source &
                          Arrival)
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={postFuelPricePerLitre}
                            onChange={(e) =>
                              setPostFuelPricePerLitre(e.target.value)
                            }
                            className="w-full rounded-xl bg-surface-container-low p-3 text-xs font-black outline-none border border-outline-variant/10"
                            placeholder="Fuel Price/Litre"
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={postMileage}
                            onChange={(e) => setPostMileage(e.target.value)}
                            className="w-full rounded-xl bg-surface-container-low p-3 text-xs font-black outline-none border border-outline-variant/10"
                            placeholder="Mileage (km/l)"
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={postTollAmount}
                            onChange={(e) => setPostTollAmount(e.target.value)}
                            className="w-full rounded-xl bg-surface-container-low p-3 text-xs font-black outline-none border border-outline-variant/10"
                            placeholder="Toll Amount"
                          />
                        </div>
                      </div>

                      {(isPosting || isRoutePreviewVisible) && (
                        <div className="rounded-2xl border border-primary/20 bg-surface-container-low/60 p-5">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                              Live Route Calculation
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/70">
                              {Math.round(routeCalcProgress)}%
                            </p>
                          </div>
                          <div className="relative h-28 sm:h-36 overflow-hidden rounded-2xl border border-outline-variant/10 bg-[radial-gradient(circle_at_20%_20%,rgba(38,166,154,0.18),transparent_55%),radial-gradient(circle_at_85%_75%,rgba(16,185,129,0.14),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(15,23,42,0.04))]">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
                            <div className="absolute left-[12%] top-[16%] h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(38,166,154,0.2)]" />
                            <div className="absolute bottom-[14%] right-[12%] h-3 w-3 rounded-full bg-secondary shadow-[0_0_0_4px_rgba(245,158,11,0.24)]" />
                            <div className="absolute left-[13%] top-[18%] h-[2px] w-[74%] origin-left bg-outline-variant/40">
                              <div
                                className="h-full origin-left bg-linear-to-r from-primary via-secondary to-primary transition-transform duration-200"
                                style={{
                                  transform: `scaleX(${Math.max(routeCalcProgress, 1) / 100})`,
                                }}
                              />
                            </div>
                            <div
                              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg transition-all duration-200"
                              style={{
                                left: `${13 + (Math.min(routeCalcProgress, 100) / 100) * 74}%`,
                                top: `${18 + (Math.min(routeCalcProgress, 100) / 100) * 68}%`,
                              }}
                            />
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant/70">
                              <span className="max-w-[42%] truncate">{postSource || "Source"}</span>
                              <span className="max-w-[42%] truncate text-right">{postDestination || "Destination"}</span>
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-outline-variant/20">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-primary via-secondary to-primary transition-all duration-200"
                              style={{ width: `${Math.max(routeCalcProgress, 2)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/65">
                            {isPosting
                              ? "Calculating distance from point 1 to point 2..."
                              : "Distance computed and expedition synchronized."}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={createPersonalTripPost}
                        disabled={isPosting || !loggedIn}
                        className="w-full rounded-2xl bg-primary py-5 text-[11px] font-black uppercase tracking-widest text-on-primary shadow-2xl shadow-primary/20 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
                      >
                        {isPosting
                          ? "Synchronizing Expedition..."
                          : "Launch Discovery Mission"}
                      </button>
                    </div>
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
