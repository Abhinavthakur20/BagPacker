export default function LoadingPanel({
  label = "Loading...",
  className = "",
}) {
  return (
    <div
      className={`rounded-3xl bg-surface-container-low p-10 text-center text-on-surface-variant ${className}`}
    >
      <div className="mx-auto max-w-sm space-y-4">
        <div className="flex justify-center gap-2">
          <span className="h-2.5 w-16 rounded-full bg-primary/80" />
          <span className="h-2.5 w-6 rounded-full bg-secondary-container" />
          <span className="h-2.5 w-10 rounded-full bg-primary/30" />
        </div>
        <div className="space-y-2">
          <div className="mx-auto h-3 w-40 rounded-full bg-outline-variant/60" />
          <div className="mx-auto h-3 w-28 rounded-full bg-outline-variant/35" />
        </div>
        <p className="text-sm font-semibold">{label}</p>
      </div>
    </div>
  );
}
