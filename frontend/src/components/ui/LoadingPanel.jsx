export default function LoadingPanel({
  label = "Loading...",
  className = "",
  variant = "page",
}) {
  const cardClass =
    variant === "compact"
      ? "rounded-2xl bg-surface-container-low p-6"
      : "rounded-3xl bg-surface-container-low p-8 md:p-10";

  const renderSkeleton = () => {
    if (variant === "list") {
      return (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 rounded-2xl bg-white/45 p-3">
              <span className="skeleton-block h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton-block h-3 w-2/3 rounded-full" />
                <div className="skeleton-block h-3 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (variant === "grid") {
      return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((tile) => (
            <div key={tile} className="overflow-hidden rounded-xl md:rounded-2xl bg-white/45 p-2 md:p-3">
              <div className="skeleton-block h-20 sm:h-28 w-full rounded-lg md:rounded-xl" />
              <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
                <div className="skeleton-block h-2.5 md:h-3.5 w-4/5 rounded-full" />
                <div className="skeleton-block h-2 md:h-3 w-1/2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (variant === "chat") {
      return (
        <div className="space-y-3">
          <div className="mr-8 rounded-2xl bg-white/45 p-3">
            <div className="skeleton-block h-3.5 w-3/4 rounded-full" />
            <div className="mt-2 skeleton-block h-3 w-full rounded-full" />
            <div className="mt-2 skeleton-block h-3 w-2/3 rounded-full" />
          </div>
          <div className="ml-8 rounded-2xl bg-primary/10 p-3">
            <div className="skeleton-block h-3.5 w-2/3 rounded-full" />
            <div className="mt-2 skeleton-block h-3 w-4/5 rounded-full" />
          </div>
          <div className="mr-10 rounded-2xl bg-white/45 p-3">
            <div className="skeleton-block h-3.5 w-3/5 rounded-full" />
            <div className="mt-2 skeleton-block h-3 w-1/2 rounded-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="skeleton-block mx-auto h-4 w-44 rounded-full" />
          <div className="skeleton-block mx-auto h-3.5 w-32 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/45 p-4">
            <div className="skeleton-block h-3.5 w-20 rounded-full" />
            <div className="mt-3 skeleton-block h-7 w-24 rounded-xl" />
            <div className="mt-3 skeleton-block h-3 w-full rounded-full" />
          </div>
          <div className="rounded-2xl bg-white/45 p-4">
            <div className="skeleton-block h-3.5 w-28 rounded-full" />
            <div className="mt-3 skeleton-block h-7 w-20 rounded-xl" />
            <div className="mt-3 skeleton-block h-3 w-4/5 rounded-full" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${cardClass} text-on-surface-variant ${className}`}>
      <div className="mx-auto max-w-4xl space-y-4">
        {renderSkeleton()}
        <p className="text-center text-sm font-semibold">{label}</p>
      </div>
    </div>
  );
}

