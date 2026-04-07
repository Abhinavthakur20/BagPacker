import MainLayout from "../components/MainLayout";

export default function ProfilePage() {
  return (
    <MainLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="overflow-hidden rounded-3xl">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80"
            alt="Cover"
            className="h-72 w-full object-cover"
          />
        </div>

        <div className="-mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80"
              alt="User"
              className="h-36 w-36 rounded-full border-4 border-surface object-cover"
            />
            <div>
              <h1 className="font-headline text-4xl font-extrabold text-primary">
                Arjun Mehta
              </h1>
              <p className="text-on-surface-variant">
                Adventurer · 12 expeditions led · Shimla
              </p>
            </div>
          </div>
          <button className="rounded-xl bg-secondary-container px-5 py-3 font-bold text-on-secondary-container">
            Edit Profile
          </button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-lg">
              <h2 className="font-headline text-2xl font-bold text-primary">
                Biography
              </h2>
              <p className="mt-3 text-on-surface-variant">
                Certified mountaineer and expedition leader focused on off-beat
                Himalayan routes and responsible travel.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-lg">
              <h3 className="font-headline text-xl font-bold text-primary">
                Travel Style
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Mountain Trekking",
                  "Photography",
                  "Local Stays",
                  "High Altitude",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-surface-container px-3 py-2 text-xs font-semibold text-primary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-2xl bg-primary-container p-6 text-white shadow-xl">
              <p className="text-xs uppercase tracking-widest text-on-primary-container">
                Trust Score
              </p>
              <p className="mt-2 font-headline text-5xl font-black">88</p>
              <p className="mt-3 text-sm text-on-primary-container">
                Aadhaar, passport, and bank account verified.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  );
}
