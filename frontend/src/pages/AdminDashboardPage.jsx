export default function AdminDashboardPage() {
  const metrics = [
    {
      label: "Pending Verifications",
      value: "42",
      delta: "+6 Today",
      icon: "assignment_late",
      accent: "bg-[#d8f5e5] text-[#0f5132]",
      featured: false,
    },
    {
      label: "Approved This Month",
      value: "318",
      delta: "+18%",
      icon: "verified_user",
      accent: "bg-[#d8f5e5] text-[#0f5132]",
      featured: false,
    },
    {
      label: "Rejected Cases",
      value: "27",
      delta: "-4 vs last month",
      icon: "gpp_bad",
      accent: "bg-[#fd9d1a] text-[#542f00]",
      featured: true,
    },
    {
      label: "Avg. Review Time",
      value: "2.8h",
      delta: "",
      icon: "timer",
      accent: "bg-[#ffe7cf] text-[#7b4500]",
      featured: false,
    },
  ];

  const verificationQueue = [
    [
      "HT",
      "Himalayan Treks Co.",
      "Rajiv Malhotra",
      "KYC + GST + License",
      "Oct 23",
      "PENDING",
    ],
    [
      "DN",
      "Desert Nomad Expeditions",
      "Sunita Rao",
      "KYC + GST",
      "Oct 22",
      "IN_REVIEW",
    ],
    [
      "KB",
      "Kerala Backwater Trails",
      "Abraham Isaac",
      "KYC + GST + Insurance",
      "Oct 21",
      "APPROVED",
    ],
    [
      "EV",
      "EverPeak Ventures",
      "Nikita Verma",
      "KYC + License",
      "Oct 20",
      "REJECTED",
    ],
  ];

  const statusClass = {
    APPROVED: "bg-[#daf7e6] text-[#0d6b3f]",
    PENDING: "bg-[#ffe9cd] text-[#9b5600]",
    IN_REVIEW: "bg-[#ddebff] text-[#1f4a8a]",
    REJECTED: "bg-[#ffd7d7] text-[#a52222]",
  };

  return (
    <div className="min-h-screen bg-[#efeee9] text-[#171717]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col lg:min-h-screen lg:flex-row">
        <aside className="flex w-full flex-col justify-between border-b border-[#ddd8cf] bg-[#efeee9] p-6 lg:w-[250px] lg:border-b-0 lg:border-r">
          <div className="space-y-8">
            <div>
              <h2 className="font-headline text-xl font-extrabold text-[#123d2d]">
                AdminPortal
              </h2>
              <p className="text-xs font-medium text-[#6b6c66]">
                Verify organizer profiles
              </p>
            </div>

            <nav className="space-y-2 text-sm font-semibold">
              {[
                ["dashboard", "Dashboard", true],
                ["inventory", "Verification Queue", false],
                ["badge", "KYC Checks", false],
                ["flag", "Reports", false],
                ["settings", "Settings", false],
              ].map(([icon, label, active]) => (
                <button
                  key={label}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                    active
                      ? "bg-[#124f38] text-white"
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
          </div>

          <div className="mt-8 space-y-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fd9d1a] px-4 py-3 text-sm font-extrabold text-[#2d2000] shadow-sm">
              <span className="material-symbols-outlined text-[18px]">
                task_alt
              </span>
              Bulk Verify
            </button>
            <div className="flex items-center justify-between rounded-xl bg-[#f7f5ef] p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-[#124f38]" />
                <div>
                  <p className="text-sm font-bold text-[#1c1f1d]">
                    Aditi Sharma
                  </p>
                  <p className="text-[10px] tracking-widest text-[#82847d]">
                    PLATFORM ADMIN
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#5b6059]">
                logout
              </span>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-7 lg:p-8">
          <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-headline text-4xl font-extrabold text-[#0f3d2d]">
                  Welcome back, Admin.
                </h1>
                <p className="mt-1 text-[#6f736b]">
                  Review organizer submissions and keep the platform trusted.
                </p>
              </div>
              <div className="w-fit rounded-xl bg-[#f7f5ef] px-4 py-3 text-right shadow-sm">
                <p className="text-[11px] text-[#777a73]">Today&apos;s Date</p>
                <p className="text-sm font-bold text-[#222422]">Oct 24, 2024</p>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((item) => (
                <article
                  key={item.label}
                  className={`rounded-2xl p-4 shadow-sm ${
                    item.featured ? "bg-[#144d36] text-white" : "bg-[#f7f5ef]"
                  }`}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span className={`rounded-md p-2 ${item.accent}`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {item.icon}
                      </span>
                    </span>
                    {item.delta ? (
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                          item.featured
                            ? "bg-white/20 text-[#cff0de]"
                            : "bg-[#eaf8ef] text-[#326a49]"
                        }`}
                      >
                        {item.delta}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`text-sm ${
                      item.featured ? "text-[#b9dcca]" : "text-[#6d726a]"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-1 font-headline text-4xl font-extrabold">
                    {item.value}
                  </p>
                  {item.label === "Avg. Review Time" ? (
                    <div className="mt-3 h-1.5 rounded-full bg-[#dedcd5]">
                      <div className="h-full w-[68%] rounded-full bg-[#9b5600]" />
                    </div>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <article className="rounded-3xl bg-[#f7f5ef] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline text-3xl font-bold text-[#17211c]">
                    Verification Throughput
                  </h2>
                  <button className="flex items-center gap-1 text-sm font-bold text-[#a26216]">
                    Last 6 Months
                    <span className="material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </button>
                </div>
                <div className="mt-8 h-44 rounded-2xl bg-gradient-to-b from-[#f3f0e8] to-[#efebe2]" />
                <div className="mt-6 grid grid-cols-6 text-center text-[10px] font-bold tracking-widest text-[#74786f]">
                  <span>MAY</span>
                  <span>JUN</span>
                  <span>JUL</span>
                  <span>AUG</span>
                  <span className="text-[#a26216]">SEP</span>
                  <span>OCT</span>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-3xl bg-[#194f3c] shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
                  alt="Priority verification"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-5" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#ffd18a]">
                    PRIORITY REVIEW
                  </p>
                  <h3 className="mt-2 font-headline text-3xl font-extrabold leading-tight">
                    12 Profiles Need Manual KYC Validation
                  </h3>
                  <p className="mt-2 text-sm text-white/85">
                    Escalated by fraud-detection rules
                  </p>
                  <button className="mt-4 w-full rounded-xl border border-white/45 bg-white/10 px-4 py-2.5 font-bold backdrop-blur-sm">
                    Open Queue
                  </button>
                </div>
              </article>
            </section>

            <section className="overflow-hidden rounded-3xl bg-[#f7f5ef] shadow-sm">
              <header className="flex items-center justify-between border-b border-[#e6e1d7] px-5 py-4">
                <h2 className="font-headline text-3xl font-bold text-[#17211c]">
                  Organizer Verification Queue
                </h2>
                <button className="text-sm font-bold text-[#a26216]">
                  Download CSV ↓
                </button>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.14em] text-[#7f837c]">
                    <tr>
                      <th className="px-5 py-4">Organizer</th>
                      <th className="px-5 py-4">Owner</th>
                      <th className="px-5 py-4">Docs</th>
                      <th className="px-5 py-4">Submitted</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationQueue.map((item) => (
                      <tr key={item[1]} className="border-t border-[#e6e1d7]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9f0df] text-[10px] font-bold text-[#1a663f]">
                              {item[0]}
                            </span>
                            <span className="font-semibold text-[#20231f]">
                              {item[1]}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[#2b2f2b]">{item[2]}</td>
                        <td className="px-5 py-4 font-semibold">{item[3]}</td>
                        <td className="px-5 py-4 font-semibold">{item[4]}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide ${statusClass[item[5]]}`}
                          >
                            {item[5]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xl font-bold leading-none text-[#5d5f5b]">
                          ...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 text-center text-sm font-bold text-[#20231f]">
                View All Verifications
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="bg-[#004328] px-5 py-6 text-[#d9f4e8]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
          <div>
            <p className="font-headline text-2xl font-extrabold text-[#fd9d1a]">
              BagPacker
            </p>
            <p className="text-xs">
              © 2024 BagPacker Expedition Tech. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#d3ebe0]">
            <span>About Us</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
