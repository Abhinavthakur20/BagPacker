import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";

const AI_ROOM_ID = "__travel_copilot__";
const AI_CONTACT = {
  id: AI_ROOM_ID,
  name: "Travel Copilot",
  preview: "Packing, routes, safety checklist, instant Q&A",
  route: "AI Assistant",
  type: "ai_copilot",
};

const getSocketUrl = () => {
  const explicitSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
  if (explicitSocketUrl) {
    return explicitSocketUrl.replace(/\/$/, "");
  }

  const apiUrl = String(import.meta.env.VITE_API_URL || "").trim();
  if (/^https?:\/\//i.test(apiUrl)) {
    return new URL(apiUrl).origin;
  }

  return window.location.origin;
};

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const isLoggedIn = Boolean(token);
  const [contacts, setContacts] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [groupMetaByRoom, setGroupMetaByRoom] = useState({});
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [isMobileRoomsOpen, setIsMobileRoomsOpen] = useState(false);
  const socketRef = useRef(null);
  const loadedRoomsRef = useRef(new Set());
  const requestedRoomId = String(searchParams.get("room") || "").trim();
  // Ref to track selectedRoomId inside socket event callbacks without stale closure
  const selectedRoomIdRef = useRef(selectedRoomId);
  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    const socket = io(getSocketUrl(), {
      transports: ["polling", "websocket"],
      withCredentials: true,
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    // Re-join the active room after any reconnection
    socket.on("connect", () => {
      const activeRoom = selectedRoomIdRef.current;
      if (activeRoom && activeRoom !== AI_ROOM_ID) {
        socket.emit("join_room", { roomId: activeRoom });
      }
    });

    socket.on("connect_error", () => {
      setError("Realtime chat connection issue. Please refresh and try again.");
    });

    socket.on("receive_message", (payload) => {
      // Guard: server emits { id, roomId, message, senderId, sender(name), timestamp }
      if (!payload?.message || !payload?.roomId) {
        return;
      }

      setMessagesByRoom((prev) => {
        const roomMessages = prev[payload.roomId] || [];
        const messageId = String(payload.id || `${Date.now()}-${Math.random()}`);
        const isMine = String(payload.senderId) === String(user?._id);

        // Replace matching optimistic entry (same text, sent by me, temp id)
        if (isMine) {
          const optimisticIdx = roomMessages.findIndex(
            (item) =>
              item.id.startsWith("client-") &&
              item.sender === "me" &&
              item.text === payload.message,
          );
          if (optimisticIdx !== -1) {
            const updated = [...roomMessages];
            updated[optimisticIdx] = { ...updated[optimisticIdx], id: messageId };
            return { ...prev, [payload.roomId]: updated };
          }
        }

        // Standard dedup by id
        if (roomMessages.some((item) => item.id === messageId)) {
          return prev;
        }

        return {
          ...prev,
          [payload.roomId]: [
            ...roomMessages,
            {
              id: messageId,
              sender: isMine ? "me" : "other",
              text: payload.message,
              time: new Date(payload.timestamp || Date.now()).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              }),
            },
          ],
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // Remove user?.name — not used in this effect, causes unnecessary reconnects
  }, [isLoggedIn, token, user?._id]);

  useEffect(() => {
    const loadRooms = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        let companionResponse = { sent: [], received: [] };
        try {
          companionResponse = await api.get("/companions/my");
        } catch (companionError) {
          const companionMessage = String(companionError?.message || "");
          const shouldIgnoreCompanionError =
            user?.role !== "traveler" ||
            companionMessage.includes("not allowed") ||
            companionMessage.includes("Route not found");
          if (!shouldIgnoreCompanionError) {
            throw companionError;
          }
        }
        let tripGroups = [];
        try {
          tripGroups = await api.get("/group-chats/my");
        } catch (groupError) {
          tripGroups = [];
          if (!String(groupError.message || "").includes("Route not found")) {
            throw groupError;
          }
        }
        const allRequests = [...(companionResponse.sent || []), ...(companionResponse.received || [])];
        const acceptedCompanionRooms = allRequests
          .filter((item) => item.status === "accepted" && item.chatRoomId)
          .map((item) => {
            const otherUser =
              String(item.requesterId?._id || item.requesterId) === String(user?._id)
                ? item.receiverId
                : item.requesterId;

            return {
              id: item.chatRoomId,
              name: otherUser?.name || "Traveler",
              preview: `${item.source} -> ${item.destination}`,
              route: `${item.source} -> ${item.destination}`,
            };
          });

        const tripRoomContacts = (Array.isArray(tripGroups) ? tripGroups : []).map((group) => ({
          id: group.roomId,
          name: group.tripId?.title || "Trip Group",
          preview: `${group.tripId?.source || "Source"} -> ${group.tripId?.destination || "Destination"}`,
          route: `${group.tripId?.source || "Source"} -> ${group.tripId?.destination || "Destination"}`,
          type: "trip_group",
          groupId: group._id,
          myRole: group.myRole,
          members: Array.isArray(group.members) ? group.members : [],
        }));

        const combinedContacts = [AI_CONTACT, ...tripRoomContacts, ...acceptedCompanionRooms];
        setContacts(combinedContacts);
        setGroupMetaByRoom(
          tripRoomContacts.reduce((acc, item) => {
            acc[item.id] = {
              groupId: item.groupId,
              myRole: item.myRole,
              members: item.members,
            };
            return acc;
          }, {}),
        );
        if (combinedContacts.length) {
          const hasRequestedRoom = requestedRoomId
            ? combinedContacts.some((contact) => contact.id === requestedRoomId)
            : false;
          setSelectedRoomId((current) => {
            if (hasRequestedRoom) {
              return requestedRoomId;
            }
            return current || combinedContacts[0].id;
          });
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Reset loaded-rooms cache so switching accounts / re-login fetches fresh history
    loadedRoomsRef.current = new Set();
    loadRooms();
  }, [isLoggedIn, requestedRoomId, user?._id, user?.role]);

  useEffect(() => {
    if (!requestedRoomId || !contacts.length) {
      return;
    }
    const hasRequestedRoom = contacts.some((contact) => contact.id === requestedRoomId);
    if (hasRequestedRoom) {
      setSelectedRoomId(requestedRoomId);
    }
  }, [contacts, requestedRoomId]);

  useEffect(() => {
    // Emit join_room whenever the room changes AND the socket is ready.
    // We also re-emit on socket reconnect inside the connection effect.
    if (socketRef.current?.connected && selectedRoomId && selectedRoomId !== AI_ROOM_ID) {
      socketRef.current.emit("join_room", { roomId: selectedRoomId });
    }
  }, [selectedRoomId]);

  useEffect(() => {
    const loadRoomMessages = async () => {
      if (
        !selectedRoomId ||
        selectedRoomId === AI_ROOM_ID ||
        loadedRoomsRef.current.has(selectedRoomId)
      ) {
        return;
      }

        try {
          setIsMessagesLoading(true);
        const history = await api.get(
          `/chat/rooms/${encodeURIComponent(selectedRoomId)}/messages?page=1&limit=150`,
          { cacheTtlMs: 15000 },
        );
        const normalized = (Array.isArray(history?.items) ? history.items : []).map((item) => ({
            id: String(item._id),
            sender: String(item.senderId) === String(user?._id) ? "me" : "other",
            text: item.message,
          time: new Date(item.sentAt || Date.now()).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          }),
        }));

        setMessagesByRoom((current) => {
          const existing = current[selectedRoomId] || [];
          const existingById = new Map(existing.map((item) => [String(item.id), item]));

          for (const item of normalized) {
            existingById.set(String(item.id), item);
          }

          return {
            ...current,
            [selectedRoomId]: [...existingById.values()],
          };
        });
        loadedRoomsRef.current.add(selectedRoomId);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsMessagesLoading(false);
      }
    };

    loadRoomMessages();
  }, [selectedRoomId, user?._id]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedRoomId) || null,
    [contacts, selectedRoomId],
  );

  const fallbackTripContact = useMemo(
    () => contacts.find((contact) => contact.id !== AI_ROOM_ID) || null,
    [contacts],
  );
  const roomMessages = messagesByRoom[selectedRoomId] || [];
  const recentRoomMessages = useMemo(
    () =>
      (roomMessages || []).slice(-10).map((item) => ({
        sender: item.sender,
        text: item.text,
        time: item.time,
      })),
    [roomMessages],
  );
  const aiConversationMessages = useMemo(
    () =>
      (messagesByRoom[AI_ROOM_ID] || []).slice(-10).map((item) => ({
        sender: item.sender,
        text: item.text,
        time: item.time,
      })),
    [messagesByRoom],
  );
  const connectedChats = useMemo(
    () =>
      contacts
        .filter((contact) => contact.id !== AI_ROOM_ID)
        .slice(0, 12)
        .map((contact) => ({
          name: contact.name,
          route: contact.route || contact.preview || "",
          type: contact.type || "companion_chat",
        })),
    [contacts],
  );
  const selectedGroupMeta =
    selectedRoomId === AI_ROOM_ID ? null : groupMetaByRoom[selectedRoomId] || null;
  const copilotContext = useMemo(
    () => ({
      source:
        (selectedContact?.id !== AI_ROOM_ID ? selectedContact : fallbackTripContact)?.route
          ?.split("->")?.[0]
          ?.trim() || "",
      destination:
        (selectedContact?.id !== AI_ROOM_ID ? selectedContact : fallbackTripContact)?.route
          ?.split("->")?.[1]
          ?.trim() || "",
      roomLabel:
        (selectedContact?.id !== AI_ROOM_ID ? selectedContact : fallbackTripContact)?.name || "",
      companionName:
        (selectedContact?.id !== AI_ROOM_ID ? selectedContact : fallbackTripContact)?.name || "",
      activeRoomType: selectedContact?.type || "direct_chat",
      activeRoute: selectedContact?.route || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      localeTime: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      recentConversation: aiConversationMessages,
      recentRoomMessages,
      connectedChats,
    }),
    [aiConversationMessages, connectedChats, fallbackTripContact, recentRoomMessages, selectedContact],
  );

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
    if (selectedRoomId) {
      setIsMobileRoomsOpen(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId !== AI_ROOM_ID) {
      return;
    }

    setMessagesByRoom((prev) => {
      const existing = prev[AI_ROOM_ID] || [];
      if (existing.length) {
        return prev;
      }

      return {
        ...prev,
        [AI_ROOM_ID]: [
          {
            id: "ai-welcome",
            sender: "other",
            text: "Hi! I am your Travel Copilot. Ask me about packing, routes, meetup safety, or any trip question.",
            time: new Date().toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            }),
          },
        ],
      };
    });
  }, [selectedRoomId]);

  const removeMember = async (memberUserId) => {
    if (!selectedGroupMeta?.groupId) {
      return;
    }

    try {
      await api.put(
        `/group-chats/${selectedGroupMeta.groupId}/members/${memberUserId}/remove`,
        {},
      );
      setGroupMetaByRoom((current) => {
        const updated = { ...current };
        const roomMeta = updated[selectedRoomId];
        if (!roomMeta) {
          return current;
        }

        updated[selectedRoomId] = {
          ...roomMeta,
          members: (roomMeta.members || []).filter(
            (member) => String(member.userId?._id || member.userId) !== String(memberUserId),
          ),
        };

        return updated;
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const send = async () => {
    if (!draft.trim() || !selectedRoomId) {
      return;
    }

    const trimmedMessage = draft.trim();
    const messageTime = new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (selectedRoomId === AI_ROOM_ID) {
      const userMessageId = `ai-user-${Date.now()}-${Math.random()}`;
      setMessagesByRoom((current) => ({
        ...current,
        [AI_ROOM_ID]: [
          ...(current[AI_ROOM_ID] || []),
          {
            id: userMessageId,
            sender: "me",
            text: trimmedMessage,
            time: messageTime,
          },
        ],
      }));
      setDraft("");

      try {
        setIsAiReplying(true);
        setError("");
        const response = await api.post("/ai/copilot", {
          intent: "qa",
          message: trimmedMessage,
          context: copilotContext,
        });
        const aiMessageId = `ai-reply-${Date.now()}-${Math.random()}`;
        setMessagesByRoom((current) => ({
          ...current,
          [AI_ROOM_ID]: [
            ...(current[AI_ROOM_ID] || []),
            {
              id: aiMessageId,
              sender: "other",
              text: response?.answer || "I could not generate a reply right now.",
              suggestedTrips: response?.suggestedTrips || [],
              time: new Date().toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              }),
            },
          ],
        }));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsAiReplying(false);
      }
      return;
    }

    if (!socketRef.current) {
      return;
    }

    const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Optimistic update — show message immediately before server echo
    setMessagesByRoom((current) => ({
      ...current,
      [selectedRoomId]: [
        ...(current[selectedRoomId] || []),
        {
          id: clientMessageId,
          sender: "me",
          text: trimmedMessage,
          time: messageTime,
        },
      ],
    }));

    setDraft("");

    socketRef.current.emit("send_message", {
      roomId: selectedRoomId,
      message: trimmedMessage,
      clientMessageId,
    });
  };

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="rounded-2xl bg-error-container p-6 font-semibold text-on-error-container">
            Please login to use chat.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout withFooter={false}>
      <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1440px] overflow-hidden bg-[#efeee9]">
        <aside className="hidden w-[320px] border-r border-[#dbd7cd] bg-[#efeee9] p-4 md:block">
          <h1 className="font-manrope text-2xl font-extrabold text-on-surface">
            Messages
          </h1>

          {error ? (
            <div className="mt-4 rounded-xl bg-error-container px-3 py-2.5 text-sm font-semibold text-error">
              {error}
            </div>
          ) : null}

          <div className="mt-4 space-y-1.5">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedRoomId(contact.id)}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ${
                  selectedRoomId === contact.id ? "bg-surface-container-high" : "hover:bg-[#e5e3dd]"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#124f38] font-bold text-white">
                  {contact.id === AI_ROOM_ID ? (
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  ) : (
                    contact.name.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-manrope text-xl font-bold text-[#1b2822]">
                    {contact.name}
                  </p>
                  <p className="truncate text-sm text-[#6f736b]">{contact.preview}</p>
                </div>
              </button>
            ))}

            {!isLoading && !contacts.length ? (
              <div className="rounded-2xl bg-surface-container-high p-4 text-sm text-[#6f736b]">
                No companion or trip group chats yet.
              </div>
            ) : null}

            {isLoading ? (
              <LoadingPanel
                label="Loading chats..."
                variant="list"
                className="rounded-2xl !bg-surface-container-high !p-6"
              />
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col min-h-0 bg-[#f6f4ee]">
          <header className="flex items-center justify-between border-b border-[#dbd7cd] px-4 py-4 md:px-6">
            <div>
              <h2 className="break-words font-manrope text-xl font-extrabold text-on-surface sm:text-lg">
                {selectedContact?.name || "Select a chat"}
              </h2>
              <p className="text-xs text-[#6e736a]">
                {selectedContact?.id === AI_ROOM_ID
                  ? "Telegram-style AI chat for all travel questions."
                  : selectedContact?.route || "Companion and trip group rooms will appear here."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileRoomsOpen(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-surface-container-high px-3 py-2 text-sm font-bold text-on-surface md:hidden"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              Rooms
            </button>
            {selectedGroupMeta ? (
              <p className="hidden rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-on-surface md:block">
                {selectedGroupMeta.myRole === "admin" ? "Organizer admin" : "Trip member"}
              </p>
            ) : null}
          </header>

          {selectedGroupMeta ? (
            <div className="border-b border-[#dbd7cd] bg-[#ece8df] px-6 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                Group members
              </p>
              <div className="flex flex-wrap gap-2">
                {(selectedGroupMeta.members || []).map((member) => {
                  const memberId = String(member.userId?._id || member.userId || "");
                  const memberName = member.userId?.name || "Traveler";
                  const canRemove =
                    selectedGroupMeta.myRole === "admin" &&
                    memberId &&
                    memberId !== String(user?._id);

                  return (
                    <div
                      key={`${selectedRoomId}-${memberId}`}
                      className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface"
                    >
                      <span className="font-semibold">{memberName}</span>
                      {member.role === "admin" ? (
                        <span className="rounded-full bg-[#f2f9d8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#858585]">
                          admin
                        </span>
                      ) : null}
                      {canRemove ? (
                        <button
                          onClick={() => removeMember(memberId)}
                          className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold uppercase text-error"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ✅ chat-scroll is now correctly inside <section> at the same level as header/footer */}
          <div className="chat-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-7 md:py-5">
            {isMessagesLoading ? (
              <LoadingPanel
                label="Loading messages..."
                variant="chat"
                className="h-full rounded-2xl !bg-surface-container-high !p-6"
              />
            ) : roomMessages.length ? (
              roomMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[84%] md:max-w-[72%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        message.sender === "me"
                          ? "bg-[#0d432d] text-white"
                          : "bg-surface-container-high text-[#272b27]"
                      }${
                        message.sender !== "me" && selectedRoomId === AI_ROOM_ID
                          ? " copilot-markdown"
                          : ""
                      }`}
                    >
                      {message.sender !== "me" && selectedRoomId === AI_ROOM_ID ? (
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      ) : (
                        message.text
                      )}
                    </div>
                    {message.suggestedTrips && message.suggestedTrips.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {message.suggestedTrips.map((trip) => (
                          <Link 
                            key={trip._id} 
                            to={`/trips/${trip._id}`}
                            className="flex gap-3 rounded-xl bg-surface-container p-3 shadow-sm border border-outline-variant/20 transition-all hover:-translate-y-0.5 hover:shadow-md"
                          >
                            {trip.image ? (
                              <img src={trip.image} alt={trip.title} className="h-16 w-16 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-container-high">
                                <span className="material-symbols-outlined text-on-surface-variant">image</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-manrope text-sm font-bold text-on-surface">{trip.title}</h4>
                              <p className="mt-0.5 text-xs text-on-surface-variant">{trip.duration}</p>
                              <p className="mt-1 text-sm font-bold text-primary">₹{trip.pricePerPerson.toLocaleString("en-IN")}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-1 px-1 text-[11px] text-on-surface-variant">
                      {message.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-[#6f736b]">
                {selectedRoomId
                  ? "No messages yet. Start the conversation."
                  : "Choose an accepted companion chat to begin."}
              </div>
            )}
            {selectedRoomId === AI_ROOM_ID && isAiReplying ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-container-high px-4 py-3 text-sm text-[#4f5550]">
                  Travel Copilot is typing...
                </div>
              </div>
            ) : null}
          </div>

          <footer className="border-t border-[#dbd7cd] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-7 md:py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-high px-3 py-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && send()}
                placeholder={
                  selectedRoomId === AI_ROOM_ID ? "Ask Travel Copilot..." : "Type a message..."
                }
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#848880]"
                disabled={!selectedRoomId}
              />
              <button
                onClick={send}
                disabled={!selectedRoomId}
                className="rounded-xl bg-[#f94a4a] px-4 py-2 text-[#2e2200] disabled:opacity-60"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </footer>
        </section>
      </div>

      {isMobileRoomsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 p-4 md:hidden">
          <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-xl flex-col rounded-2xl bg-[#efeee9] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-manrope text-lg font-bold text-on-surface">
                Messages
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileRoomsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-on-surface"
                aria-label="Close rooms list"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error ? (
              <div className="mb-3 rounded-xl bg-error-container px-3 py-2.5 text-sm font-semibold text-error">
                {error}
              </div>
            ) : null}

            <div className="chat-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
              {contacts.map((contact) => (
                <button
                  key={`mobile-room-${contact.id}`}
                  onClick={() => setSelectedRoomId(contact.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ${
                    selectedRoomId === contact.id ? "bg-surface-container-high" : "hover:bg-[#e5e3dd]"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#124f38] font-bold text-white">
                    {contact.id === AI_ROOM_ID ? (
                      <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                    ) : (
                      contact.name.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-manrope text-lg font-bold text-[#1b2822]">
                      {contact.name}
                    </p>
                    <p className="truncate text-sm text-[#6f736b]">{contact.preview}</p>
                  </div>
                </button>
              ))}

              {!isLoading && !contacts.length ? (
                <div className="rounded-2xl bg-surface-container-high p-4 text-sm text-[#6f736b]">
                  No companion or trip group chats yet.
                </div>
              ) : null}

              {isLoading ? (
                <LoadingPanel
                  label="Loading chats..."
                  variant="list"
                  className="rounded-2xl !bg-surface-container-high !p-5"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}

