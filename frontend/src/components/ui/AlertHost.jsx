import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeToAlerts } from "../../lib/alerts";

const toneMap = {
  success: {
    icon: "task_alt",
    iconWrap: "bg-emerald-100 text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500/18 to-teal-500/8",
    ring: "ring-emerald-200/70",
    button: "bg-emerald-700 text-white hover:bg-emerald-800",
    title: "text-emerald-950",
    accent: "bg-emerald-500",
    label: "Success",
  },
  error: {
    icon: "error",
    iconWrap: "bg-rose-100 text-rose-700",
    chip: "bg-rose-100 text-rose-700",
    gradient: "from-rose-500/18 to-orange-500/8",
    ring: "ring-rose-200/80",
    button: "bg-rose-700 text-white hover:bg-rose-800",
    title: "text-rose-950",
    accent: "bg-rose-500",
    label: "Error",
  },
  info: {
    icon: "info",
    iconWrap: "bg-sky-100 text-sky-700",
    chip: "bg-sky-100 text-sky-700",
    gradient: "from-sky-500/18 to-cyan-500/8",
    ring: "ring-sky-200/80",
    button: "bg-sky-700 text-white hover:bg-sky-800",
    title: "text-sky-950",
    accent: "bg-sky-500",
    label: "Notice",
  },
  warning: {
    iconWrap: "bg-amber-100 text-amber-700",
    chip: "bg-amber-100 text-amber-700",
    gradient: "from-amber-500/18 to-yellow-500/8",
    ring: "ring-amber-200/80",
    icon: "campaign",
    button: "bg-amber-600 text-white hover:bg-amber-700",
    title: "text-amber-950",
    accent: "bg-amber-500",
    label: "Action Required",
  },
};

export default function AlertHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    return subscribeToAlerts((alert) => {
      setQueue((current) => [...current, alert]);
    });
  }, []);

  const activeAlert = queue[0] || null;

  const styles = useMemo(() => {
    if (!activeAlert) {
      return toneMap.info;
    }

    return toneMap[activeAlert.tone] || toneMap.info;
  }, [activeAlert]);

  const closeAlert = useCallback(
    (result) => {
      if (!activeAlert) {
        return;
      }

      activeAlert.resolve(result);
      setQueue((current) => current.slice(1));
    },
    [activeAlert],
  );

  useEffect(() => {
    if (!activeAlert) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeAlert({ isConfirmed: false, isDismissed: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAlert, closeAlert]);

  useEffect(() => {
    if (!activeAlert || activeAlert.kind === "confirm") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      closeAlert({ isConfirmed: true, isDismissed: false });
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [activeAlert, closeAlert]);

  if (!activeAlert) {
    return null;
  }

  const isConfirm = activeAlert.kind === "confirm";

  return createPortal(
    <div
      className={`fixed z-[120] ${
        isConfirm
          ? "inset-0 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-[2px]"
          : "right-4 top-4 sm:right-6 sm:top-6"
      }`}
    >
      <div
        role="alertdialog"
        aria-modal={isConfirm ? "true" : "false"}
        className={`w-full overflow-hidden rounded-3xl bg-surface ring-1 shadow-[0_20px_60px_rgba(15,23,42,0.22)] ${
          isConfirm ? "max-w-2xl" : "max-w-2xl"
        } ${styles.ring}`}
      >
        <div className={`relative bg-gradient-to-r ${styles.gradient} px-5 pb-2 pt-2`}>
          <span className={`absolute left-0 top-0 h-full w-1.5 ${styles.accent}`} />
          <div className="ml-1 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined mt-0.5 rounded-2xl p-1.5 text-[18px] ${styles.iconWrap}`}
              >
                {styles.icon}
              </span>
              <div className="min-w-0">
                <p className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${styles.chip}`}>
                  {styles.label}
                </p>
                <h2 className={`text-base font-black leading-tight ${styles.title}`}>
                  {activeAlert.title}
                </h2>
              </div>
            </div>
            <button
              onClick={() => closeAlert({ isConfirmed: false, isDismissed: true })}
              className="material-symbols-outlined rounded-xl p-1 text-on-surface-variant/70 transition hover:bg-black/5 hover:text-on-surface"
              aria-label="Close alert"
            >
              close
            </button>
          </div>
        </div>

        <div className="px-5 pb-3 pt-2">
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {activeAlert.text || "Please review this action before continuing."}
          </p>

          <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            {isConfirm ? (
              <button
                onClick={() => closeAlert({ isConfirmed: false, isDismissed: true })}
                className="rounded-xl bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container"
              >
                {activeAlert.cancelButtonText || "Cancel"}
              </button>
            ) : null}

            <button
              onClick={() => closeAlert({ isConfirmed: true, isDismissed: false })}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${styles.button}`}
            >
              {activeAlert.confirmButtonText || "Okay"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

