import { useState } from "react";

export default function CreateTripPage() {
  const [tripForm, setTripForm] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    totalSeats: "",
    price: "",
    description: "",
  });

  const updateTripField = (field, value) => {
    setTripForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#efeee9] text-[#171717]">
      <header className="border-b border-[#ddd8cf] bg-[#f4f2ec]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-4">
          <h1 className="font-headline text-4xl font-extrabold text-[#132c22]">
            BagPacker
          </h1>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#1d2a24] md:flex">
            <a href="/" className="hover:text-[#8f5300]">
              Home
            </a>
            <a href="/trips/search" className="hover:text-[#8f5300]">
              Search Trips
            </a>
            <a href="/companion" className="hover:text-[#8f5300]">
              Find Companion
            </a>
            <a
              href="/payment"
              className="border-b-2 border-[#fd9d1a] pb-1 text-[#8f5300]"
            >
              My Bookings
            </a>
            <a href="/chat" className="hover:text-[#8f5300]">
              Chat
            </a>
          </nav>
          <div className="flex items-center gap-2 text-[#213229]">
            <span className="material-symbols-outlined">account_circle</span>
            <span className="material-symbols-outlined">logout</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col lg:min-h-[calc(100vh-72px)] lg:flex-row">
        <aside className="w-full border-b border-[#ddd8cf] px-5 py-6 lg:w-[250px] lg:border-b-0 lg:border-r">
          <div>
            <h2 className="font-headline text-xl font-extrabold text-[#123d2d]">
              ORGANIZER PORTAL
            </h2>
            <p className="text-xs font-medium text-[#6b6c66]">
              Manage your expeditions
            </p>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-semibold">
            {[
              ["dashboard", "Dashboard", false],
              ["map", "My Trips", true],
              ["groups", "Companions", false],
              ["chat", "Messages", false],
              ["settings", "Settings", false],
            ].map(([icon, label, active]) => (
              <button
                key={label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                  active
                    ? "bg-[#124f38] text-white shadow"
                    : "text-[#1f2a25] hover:bg-[#e6e2d9]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {icon}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fd9d1a] px-4 py-3 text-sm font-extrabold text-[#2d2000] shadow-sm">
            <span className="material-symbols-outlined text-[18px]">
              add_circle
            </span>
            Create New Trip
          </button>
        </aside>

        <main className="flex-1 px-5 py-6 md:px-7 lg:px-8">
          <header className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a26216]">
              Step 1 of 4
            </p>
            <h2 className="mt-1 font-headline text-5xl font-extrabold text-[#0f3d2d]">
              Create New Expedition
            </h2>
            <p className="mt-2 max-w-3xl text-[#6f736b]">
              Craft a memorable journey for fellow explorers. Provide detailed
              information to ensure a high trust score and more bookings.
            </p>
          </header>

          <div className="mb-7 grid grid-cols-4 border-b border-[#d9d4cb] text-xs font-semibold text-[#6f736b]">
            {["Basic Details", "Itinerary", "Pickup Points", "Preview"].map(
              (item, index) => (
                <div key={item} className="relative py-3">
                  <span className={index === 0 ? "text-[#1f2a25]" : ""}>
                    {item}
                  </span>
                  {index === 0 ? (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#0f3d2d]" />
                  ) : null}
                </div>
              ),
            )}
          </div>

          <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
            <section className="space-y-5">
              <article className="rounded-2xl bg-[#f7f5ef] p-5 shadow-sm md:p-6">
                <h3 className="flex items-center gap-2 font-headline text-3xl font-bold text-[#132c22]">
                  <span className="material-symbols-outlined text-[#a26216]">
                    info
                  </span>
                  Core Trip Information
                </h3>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                      Trip Title
                    </span>
                    <input
                      className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                      placeholder="e.g., Mystical Spiti Valley Winter Expedition"
                      value={tripForm.title}
                      onChange={(e) => updateTripField("title", e.target.value)}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                      Target Cities (Comma Separated)
                    </span>
                    <input
                      className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                      placeholder="Manali, Kaza, Langza, Hikkim"
                      value={tripForm.destination}
                      onChange={(e) =>
                        updateTripField("destination", e.target.value)
                      }
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                        Start Date
                      </span>
                      <input
                        type="date"
                        className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                        value={tripForm.startDate}
                        onChange={(e) =>
                          updateTripField("startDate", e.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                        End Date
                      </span>
                      <input
                        type="date"
                        className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                        value={tripForm.endDate}
                        onChange={(e) =>
                          updateTripField("endDate", e.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                        Price Per Person (₹)
                      </span>
                      <input
                        type="number"
                        className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                        placeholder="₹ 24,999"
                        value={tripForm.price}
                        onChange={(e) =>
                          updateTripField("price", e.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                        Total Seats
                      </span>
                      <input
                        type="number"
                        className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                        placeholder="12"
                        value={tripForm.totalSeats}
                        onChange={(e) =>
                          updateTripField("totalSeats", e.target.value)
                        }
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#555b55]">
                      Trip Description
                    </span>
                    <textarea
                      rows={5}
                      className="rounded-xl border border-[#e3dfd6] bg-[#eeebe4] px-4 py-3"
                      placeholder="Describe the vibe, the sights, and why someone should join this trip..."
                      value={tripForm.description}
                      onChange={(e) =>
                        updateTripField("description", e.target.value)
                      }
                    />
                  </label>
                </div>
              </article>

              <article className="rounded-2xl border-2 border-dashed border-[#c7c2b7] bg-[#efece4] p-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#c4e8d0] text-[#124f38]">
                  <span className="material-symbols-outlined">add_a_photo</span>
                </span>
                <p className="mt-5 text-xl font-bold text-[#1f2a25]">
                  Upload Hero Images
                </p>
                <p className="mt-1 text-sm text-[#666a63]">
                  Drag and drop up to 5 high-res landscape photos
                </p>
              </article>
            </section>

            <aside className="space-y-4">
              <article className="overflow-hidden rounded-2xl bg-[#f7f5ef] shadow-sm">
                <div className="h-30 bg-[#154c37]" />
                <div className="p-4">
                  <span className="inline-block rounded bg-[#fd9d1a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2d2000]">
                    Live Preview
                  </span>
                  <h4 className="mt-3 font-headline text-3xl font-bold text-[#1f2a25]">
                    {tripForm.title || "Trip Title Appears Here"}
                  </h4>
                  <div className="mt-3 flex items-center justify-between text-sm text-[#5f625d]">
                    <span>
                      ★ {tripForm.destination ? "4.8 (26)" : "0.0 (0)"}
                    </span>
                    <span className="font-semibold text-[#1d2823]">
                      {tripForm.price ? `₹ ${tripForm.price}` : "₹ --,--"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-[#676b64]">
                    <p>📅 Select dates to preview</p>
                    <p>👥 {tripForm.totalSeats || "0"}+ seats available</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl bg-[#154c37] p-5 text-white shadow-sm">
                <span className="inline-flex rounded-md bg-[#b6e5c7] p-2 text-[#104330]">
                  <span className="material-symbols-outlined text-[16px]">
                    verified_user
                  </span>
                </span>
                <h4 className="mt-4 font-headline text-2xl font-bold">
                  Trust Score Tip
                </h4>
                <p className="mt-2 text-sm text-[#d3efe0]">
                  Detailed descriptions and clear cancellation policies increase
                  your trust score by up to 40%. Be specific about inclusions.
                </p>
              </article>
            </aside>
          </div>

          <div className="mt-7 flex items-center justify-end gap-4">
            <button className="rounded-xl px-6 py-3 text-sm font-semibold text-[#2a2d29]">
              Cancel
            </button>
            <button className="rounded-xl bg-[#0f3d2d] px-7 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,61,45,0.35)]">
              Next: Itinerary →
            </button>
          </div>
        </main>
      </div>

      <footer className="bg-[#003c25] px-5 py-5 text-[#d9f4e8]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <p className="font-headline text-2xl font-extrabold text-[#fd9d1a]">
            BagPacker
          </p>
          <div className="flex gap-5 text-[#d3ebe0]">
            <span>About Us</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Support</span>
            <span>Careers</span>
          </div>
          <p>© 2024 BagPacker Expedition Tech. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
