import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeToAlerts } from "../../lib/alerts";

const toneMap = {
  success: {
    badge: "bg-[#d8f5e5] text-[#0f5132]",
    panel: "border-[#b9dec8]",
    icon: "check_circle",
    button: "bg-primary text-white",
  },
  error: {
    badge: "bg-[#ffd7d7] text-[#8a1f1f]",
    panel: "border-[#efb9be]",
    icon: "error",
    button: "bg-[#7f1d1d] text-white",
  },
  info: {
    badge: "bg-[#ddebff] text-[#1f4a8a]",
    panel: "border-[#bfd0d9]",
    icon: "info",
    button: "bg-primary text-white",
  },
  warning: {
    badge: "bg-[#ffe9cd] text-[#9b5600]",
    panel: "border-[#f0d4a5]",
    icon: "campaign",
    button: "bg-[#f94a4a] text-on-secondary-container",
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

  if (!activeAlert) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#858585]/45 px-4 backdrop-blur-[3px]">
      <div
        className={`w-full max-w-md overflow-hidden rounded-[28px] border bg-surface shadow-[0_24px_80px_rgba(1,45,29,0.24)] ${styles.panel}`}
      >
        <div className="bg-linear-to-r from-primary to-primary-container px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined rounded-full p-2 text-[22px] ${styles.badge}`}
              >
                {styles.icon}
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f94a4a]">
                  BagPacker Notice
                </p>
                <h2 className="mt-1 font-manrope text-lg font-extrabold">
                  {activeAlert.title}
                </h2>
              </div>
            </div>
            <button
              onClick={() => closeAlert({ isConfirmed: false, isDismissed: true })}
              className="material-symbols-outlined rounded-full p-2 text-white/85 transition hover:bg-white/10"
              aria-label="Close alert"
            >
              close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {activeAlert.text || "Please review this action before continuing."}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {activeAlert.kind === "confirm" ? (
              <button
                onClick={() => closeAlert({ isConfirmed: false, isDismissed: true })}
                className="rounded-xl bg-surface-container-low px-5 py-3 text-sm font-bold text-primary"
              >
                {activeAlert.cancelButtonText || "Cancel"}
              </button>
            ) : null}

            <button
              onClick={() =>
                closeAlert(
                  activeAlert.kind === "confirm"
                    ? { isConfirmed: true, isDismissed: false }
                    : { isConfirmed: true, isDismissed: false },
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-bold ${styles.button}`}
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

