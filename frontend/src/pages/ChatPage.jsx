import { useState } from "react";
import MainLayout from "../components/MainLayout";

export default function ChatPage() {
  const contacts = [
    {
      id: 1,
      name: "Arjun Mehta",
      preview: "Check out the Spiti itinerary!",
      time: "2:45 PM",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
      active: true,
    },
    {
      id: 2,
      name: "Priya Sharma",
      preview: "Great, let's meet at the trailhead.",
      time: "Yesterday",
      avatar:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&q=80",
      active: false,
    },
    {
      id: 3,
      name: "Vikram Singh",
      preview: "Is the 4x4 confirmed for Leh?",
      time: "Tue",
      avatar:
        "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=120&q=80",
      active: false,
    },
    {
      id: 4,
      name: "Ananya K.",
      preview: "The flight got delayed by 2 hours.",
      time: "Mon",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
      active: false,
    },
  ];

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "other",
      type: "text",
      text: "Hey! I've finalized the Spiti route for our next expedition. Want to take a look?",
      time: "2:40 PM",
    },
    {
      id: 2,
      sender: "me",
      type: "text",
      text: "Absolutely! Does it include the Pin Valley trek? I've heard the landscapes there are surreal this time of year.",
      time: "2:42 PM",
    },
    {
      id: 3,
      sender: "other",
      type: "image",
      image:
        "https://images.unsplash.com/photo-1609184856943-7e1a8e6a7e76?auto=format&fit=crop&w=1200&q=80",
      time: "2:45 PM",
    },
    {
      id: 4,
      sender: "other",
      type: "text",
      text: "Yes! Including Pin Valley and a night stay at Key Monastery. Here is the view we're looking at.",
      time: "2:45 PM",
    },
    {
      id: 5,
      sender: "me",
      type: "text",
      text: "Check out the Spiti itinerary! Looks insane. Let's book the 4x4.",
      time: "2:46 PM",
    },
  ]);

  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "me",
        type: "text",
        text: draft,
        time: "Now",
      },
    ]);
    setDraft("");
  };

  return (
    <MainLayout withFooter={false}>
      <div className="mx-auto flex h-[calc(100vh-82px)] w-full max-w-[1440px] overflow-hidden bg-[#efeee9]">
        <aside className="hidden w-[320px] border-r border-[#dbd7cd] bg-[#efeee9] p-4 md:block">
          <h1 className="font-headline text-4xl font-extrabold text-[#132c22]">
            Messages
          </h1>

          <div className="mt-4 rounded-xl bg-[#e1dfd8] px-3 py-2.5 text-sm text-[#7a7f76]">
            <span className="material-symbols-outlined mr-2 align-middle text-[18px]">
              search
            </span>
            Search conversations...
          </div>

          <div className="mt-4 space-y-1.5">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ${
                  contact.active ? "bg-[#e1dfd8]" : "hover:bg-[#e5e3dd]"
                }`}
              >
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-headline text-xl font-bold text-[#1b2822]">
                      {contact.name}
                    </p>
                    <span className="text-[11px] text-[#80837c]">
                      {contact.time}
                    </span>
                  </div>
                  <p
                    className={`truncate text-sm ${contact.active ? "text-[#a26216]" : "text-[#6f736b]"}`}
                  >
                    {contact.preview}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-[#f6f4ee]">
          <header className="flex items-center justify-between border-b border-[#dbd7cd] px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                alt="Arjun Mehta"
                className="h-11 w-11 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-2xl font-extrabold text-[#132c22]">
                    Arjun Mehta
                  </h2>
                  <span className="material-symbols-outlined text-[16px] text-[#069d60]">
                    verified
                  </span>
                </div>
                <p className="text-xs text-[#6e736a]">
                  <span className="mr-1 rounded-full bg-[#bde3c9] px-2 py-0.5 font-semibold text-[#104732]">
                    TRUST 9.8
                  </span>
                  Active now
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-[#0d432d]">
              <span className="material-symbols-outlined cursor-pointer">
                call
              </span>
              <span className="material-symbols-outlined cursor-pointer">
                videocam
              </span>
              <span className="material-symbols-outlined cursor-pointer">
                more_vert
              </span>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-7">
            <div className="mx-auto w-fit rounded-full bg-[#d8d6cf] px-4 py-1 text-[10px] font-bold tracking-[0.2em] text-[#656a63]">
              TODAY
            </div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[84%] md:max-w-[72%]">
                  {message.type === "image" ? (
                    <div className="overflow-hidden rounded-2xl border-6 border-[#d8d6cf]">
                      <img
                        src={message.image}
                        alt="Shared location"
                        className="h-[250px] w-full object-cover"
                      />
                    </div>
                  ) : (
                    <p
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        message.sender === "me"
                          ? "bg-[#0d432d] text-white"
                          : "bg-[#e1dfd8] text-[#272b27]"
                      }`}
                    >
                      {message.text}
                    </p>
                  )}
                  <p className="mt-1 px-1 text-[11px] text-[#8a8f86]">
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <footer className="border-t border-[#dbd7cd] px-4 py-4 md:px-7">
            <div className="flex items-center gap-3 rounded-2xl bg-[#e1dfd8] px-3 py-2">
              <span className="material-symbols-outlined text-[#666b63]">
                add_circle
              </span>
              <span className="material-symbols-outlined text-[#666b63]">
                mood
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#848880]"
              />
              <span className="material-symbols-outlined text-[#666b63]">
                attach_file
              </span>
              <button
                onClick={send}
                className="rounded-xl bg-[#fd9d1a] px-4 py-2 text-[#2e2200]"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </footer>
        </section>
      </div>

      <footer className="border-t border-[#dbd7cd] bg-[#003c25] px-5 py-4 text-[#d9f4e8]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between text-xs">
          <p className="font-headline text-3xl font-extrabold text-[#fd9d1a]">
            BagPacker
          </p>
          <p>© 2024 BagPacker Expedition Tech. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
}
