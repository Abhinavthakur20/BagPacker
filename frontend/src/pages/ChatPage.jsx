import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  return window.location.origin;
};

export default function ChatPage() {
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
  const [isMobileRoomsOpen, setIsMobileRoomsOpen] = useState(false);
  const socketRef = useRef(null);
  const loadedRoomsRef = useRef(new Set());
  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("receive_message", (payload) => {
      if (!payload?.sender || !payload?.message || !payload?.roomId) {
        return;
      }

      setMessagesByRoom((prev) => {
        const roomMessages = prev[payload.roomId] || [];
        const messageId = String(payload.id || `${Date.now()}-${Math.random()}`);
        if (roomMessages.some((item) => item.id === messageId)) {
          return prev;
        }

        return {
          ...prev,
          [payload.roomId]: [
            ...roomMessages,
            {
              id: messageId,
              sender: String(payload.senderId) === String(user?._id) ? "me" : "other",
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
  }, [isLoggedIn, user?._id, user?.name]);

  useEffect(() => {
    const loadRooms = async () => {
      if (!isLoggedIn) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const companionResponse = await api.get("/companions/my");
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
              item.requesterId?._id === user?._id ? item.receiverId : item.requesterId;

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

        const combinedContacts = [...tripRoomContacts, ...acceptedCompanionRooms];
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
          setSelectedRoomId((current) => current || combinedContacts[0].id);
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadRooms();
  }, [isLoggedIn, user?._id]);

  useEffect(() => {
    if (socketRef.current && selectedRoomId) {
      socketRef.current.emit("join_room", { roomId: selectedRoomId, userId: user?._id });
    }
  }, [selectedRoomId, user?._id]);

  useEffect(() => {
    const loadRoomMessages = async () => {
      if (!selectedRoomId || loadedRoomsRef.current.has(selectedRoomId)) {
        return;
      }

      try {
        setIsMessagesLoading(true);
        const history = await api.get(`/chat/rooms/${encodeURIComponent(selectedRoomId)}/messages`);
        const normalized = (Array.isArray(history) ? history : []).map((item) => ({
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

  const roomMessages = messagesByRoom[selectedRoomId] || [];
  const selectedGroupMeta = groupMetaByRoom[selectedRoomId] || null;

  useEffect(() => {
    if (selectedRoomId) {
      setIsMobileRoomsOpen(false);
    }
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

  const send = () => {
    if (!draft.trim() || !selectedRoomId || !socketRef.current) {
      return;
    }

    socketRef.current.emit("send_message", {
      roomId: selectedRoomId,
      message: draft.trim(),
      userId: user?._id,
    });

    setDraft("");
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
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1440px] bg-[#efeee9]">
        <aside className="hidden w-[320px] border-r border-[#dbd7cd] bg-[#efeee9] p-4 md:block">
          <h1 className="font-headline text-4xl font-extrabold text-[#132c22]">
            Messages
          </h1>

          {error ? (
            <div className="mt-4 rounded-xl bg-[#ffd7d7] px-3 py-2.5 text-sm font-semibold text-[#8a1f1f]">
              {error}
            </div>
          ) : null}

          <div className="mt-4 space-y-1.5">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedRoomId(contact.id)}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ${
                  selectedRoomId === contact.id ? "bg-[#e1dfd8]" : "hover:bg-[#e5e3dd]"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#124f38] font-bold text-white">
                  {contact.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-headline text-xl font-bold text-[#1b2822]">
                    {contact.name}
                  </p>
                  <p className="truncate text-sm text-[#6f736b]">{contact.preview}</p>
                </div>
              </button>
            ))}

            {!isLoading && !contacts.length ? (
              <div className="rounded-2xl bg-[#e1dfd8] p-4 text-sm text-[#6f736b]">
                No companion or trip group chats yet.
              </div>
            ) : null}

            {isLoading ? (
              <LoadingPanel
                label="Loading chats..."
                className="rounded-2xl !bg-[#e1dfd8] !p-6"
              />
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[#f6f4ee]">
          <header className="flex items-center justify-between border-b border-[#dbd7cd] px-4 py-4 md:px-6">
            <div>
              <h2 className="break-words font-headline text-xl font-extrabold text-[#132c22] sm:text-2xl">
                {selectedContact?.name || "Select a chat"}
              </h2>
              <p className="text-xs text-[#6e736a]">
                {selectedContact?.route || "Companion and trip group rooms will appear here."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileRoomsOpen(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#e1dfd8] px-3 py-2 text-sm font-bold text-[#1f2e27] md:hidden"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              Rooms
            </button>
            {selectedGroupMeta ? (
              <p className="hidden rounded-full bg-[#e1dfd8] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#1f2e27] md:block">
                {selectedGroupMeta.myRole === "admin" ? "Organizer admin" : "Trip member"}
              </p>
            ) : null}
          </header>

          {selectedGroupMeta ? (
            <div className="border-b border-[#dbd7cd] bg-[#ece8df] px-6 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#4a554f]">
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
                      className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-[#1f2e27]"
                    >
                      <span className="font-semibold">{memberName}</span>
                      {member.role === "admin" ? (
                        <span className="rounded-full bg-[#d8f5e8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0f5f3f]">
                          admin
                        </span>
                      ) : null}
                      {canRemove ? (
                        <button
                          onClick={() => removeMember(memberId)}
                          className="rounded-full bg-[#ffd7d7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#8a1f1f]"
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

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-7 md:py-5">
            {isMessagesLoading ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-[#6f736b]">
                Loading messages...
              </div>
            ) : roomMessages.length ? (
              roomMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[84%] md:max-w-[72%]">
                    <p
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        message.sender === "me"
                          ? "bg-[#0d432d] text-white"
                          : "bg-[#e1dfd8] text-[#272b27]"
                      }`}
                    >
                      {message.text}
                    </p>
                    <p className="mt-1 px-1 text-[11px] text-[#8a8f86]">
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
          </div>

          <footer className="border-t border-[#dbd7cd] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-7 md:py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#e1dfd8] px-3 py-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#848880]"
                disabled={!selectedRoomId}
              />
              <button
                onClick={send}
                disabled={!selectedRoomId}
                className="rounded-xl bg-[#fd9d1a] px-4 py-2 text-[#2e2200] disabled:opacity-60"
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
              <h2 className="font-headline text-2xl font-bold text-[#132c22]">
                Messages
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileRoomsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#e1dfd8] text-[#1f2e27]"
                aria-label="Close rooms list"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error ? (
              <div className="mb-3 rounded-xl bg-[#ffd7d7] px-3 py-2.5 text-sm font-semibold text-[#8a1f1f]">
                {error}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {contacts.map((contact) => (
                <button
                  key={`mobile-room-${contact.id}`}
                  onClick={() => setSelectedRoomId(contact.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ${
                    selectedRoomId === contact.id ? "bg-[#e1dfd8]" : "hover:bg-[#e5e3dd]"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#124f38] font-bold text-white">
                    {contact.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-lg font-bold text-[#1b2822]">
                      {contact.name}
                    </p>
                    <p className="truncate text-sm text-[#6f736b]">{contact.preview}</p>
                  </div>
                </button>
              ))}

              {!isLoading && !contacts.length ? (
                <div className="rounded-2xl bg-[#e1dfd8] p-4 text-sm text-[#6f736b]">
                  No companion or trip group chats yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}
