import { useEffect, useMemo, useState } from "react";
import MainLayout from "../components/MainLayout";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowISO = tomorrow.toISOString().slice(0, 10);

export default function CompanionPage() {
  const [source, setSource] = useState("New Delhi");
  const [destination, setDestination] = useState("Spiti Valley");
  const [travelDate, setTravelDate] = useState(tomorrowISO);
  const [matches, setMatches] = useState([]);
  const [myRequests, setMyRequests] = useState({ sent: [], received: [] });
  const [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [declined, setDeclined] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loggedIn = isAuthenticated();

  const loadCompanionData = async () => {
    if (!loggedIn) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const [foundMatches, requests] = await Promise.all([
        api.get(
          `/companions/find?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&date=${travelDate}`,
        ),
        api.get("/companions/my"),
      ]);

      setMatches(Array.isArray(foundMatches) ? foundMatches : []);
      setMyRequests(requests || { sent: [], received: [] });
      setIndex(0);
    } catch (fetchError) {
      setError(fetchError.message);
      setMatches([]);
      setMyRequests({ sent: [], received: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const current = useMemo(() => {
    if (!matches.length) return null;

    const currentRequest = matches[index % matches.length];
    return {
      id: currentRequest._id,
      receiverId: currentRequest.requesterId?._id,
      name: currentRequest.requesterId?.name || "Traveler",
      route: `${currentRequest.source} -> ${currentRequest.destination}`,
      dates: new Date(currentRequest.travelDate).toLocaleDateString("en-IN"),
      bio: "Looking for a trusted travel companion.",
      trust: currentRequest.requesterId?.trustScore || 0,
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
      source: currentRequest.source,
      destination: currentRequest.destination,
      travelDate: currentRequest.travelDate,
    };
  }, [index, matches]);

  const requestRows = useMemo(() => {
    const sentRows = (myRequests.sent || []).map((item) => ({
      key: `sent-${item._id}`,
      name: item.receiverId?.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      status: item.status,
      isChatEnabled: item.status === "accepted",
    }));

    const receivedRows = (myRequests.received || []).map((item) => ({
      key: `received-${item._id}`,
      name: item.requesterId?.name || "Traveler",
      route: `${item.source} -> ${item.destination}`,
      status: item.status,
      isChatEnabled: item.status === "accepted",
    }));

    return [...sentRows, ...receivedRows];
  }, [myRequests]);

  const onDecision = async (type) => {
    if (!current) return;

    if (type === "accept") {
      try {
        await api.post("/companions/request", {
          receiverId: current.receiverId,
          source: current.source,
          destination: current.destination,
          travelDate: current.travelDate,
          vehicleType: "shared",
        });
        setAccepted((value) => value + 1);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    if (type === "decline") {
      setDeclined((value) => value + 1);
    }

    setIndex((value) => value + 1);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1320px] px-4 py-10 md:px-6">
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

        <div className="mb-6 rounded-2xl bg-[#f1eee7] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="rounded-xl bg-white px-4 py-3 text-sm"
              placeholder="Source city"
            />
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="rounded-xl bg-white px-4 py-3 text-sm"
              placeholder="Destination city"
            />
            <input
              type="date"
              value={travelDate}
              onChange={(event) => setTravelDate(event.target.value)}
              className="rounded-xl bg-white px-4 py-3 text-sm"
            />
            <button
              onClick={loadCompanionData}
              disabled={!loggedIn || isLoading}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Find Matches"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_290px]">
          <aside className="space-y-5">
            <article className="rounded-2xl bg-linear-to-br from-[#154f39] to-[#0f3f2e] p-6 text-white shadow-lg">
              <p className="font-headline text-6xl font-extrabold leading-none">
                {matches.length}
              </p>
              <p className="mt-3 text-3xl font-semibold leading-snug">
                Compatible
                <br />
                companions available
              </p>
              <p className="mt-3 text-sm text-white/75">
                Matching your selected route
              </p>
            </article>

            <article className="rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7f847c]">
                Decision Stats
              </p>
              <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-[#555b55]">
                Accepted:{" "}
                <span className="font-bold text-[#0f5f3f]">{accepted}</span>
                <br />
                Declined:{" "}
                <span className="font-bold text-[#a64040]">{declined}</span>
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
                    className="h-[530px] w-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#103f2f] via-[#103f2f]/35 to-transparent" />

                  <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#d8f5e8] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0f5f3f]">
                      Verified Pro
                    </span>
                    <span className="rounded-full bg-[#b8e6ca] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0b4f35]">
                      {current.trust} Trust
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                    <h1 className="font-headline text-5xl font-extrabold leading-tight">
                      {current.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-white/90">
                      <span>{current.route}</span>
                      <span>{current.dates}</span>
                      <span>SUV Shared</span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90">
                      {current.bio}
                    </p>
                  </div>
                </article>

                <div className="mt-7 flex items-center justify-center gap-8">
                  <button
                    onClick={() => onDecision("decline")}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#efb9be] bg-[#fff7f8] text-[#c4515f] transition hover:scale-105"
                    aria-label="Decline companion"
                  >
                    <span className="material-symbols-outlined text-[30px]">
                      close
                    </span>
                  </button>
                  <button
                    onClick={() => onDecision("accept")}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fd9d1a] text-[#2e2200] shadow-[0_14px_30px_rgba(253,157,26,0.35)] transition hover:scale-105"
                    aria-label="Accept companion"
                  >
                    <span className="material-symbols-outlined text-[34px]">
                      done
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
              <div className="rounded-2xl bg-surface-container-low p-10 text-center text-on-surface-variant">
                {isLoading
                  ? "Searching companions..."
                  : "No companion matches found for this route."}
              </div>
            )}
          </section>

          <aside>
            <article className="rounded-2xl bg-[#f1eee7] p-5 shadow-sm">
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

                      {item.isChatEnabled ? (
                        <button className="mt-3 w-full rounded-lg bg-[#275f49] py-2 text-xs font-bold uppercase tracking-wide text-white">
                          Start Chat
                        </button>
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
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
