const listeners = new Set();

export function subscribeToAlerts(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

const emitAlert = (payload) =>
  new Promise((resolve) => {
    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...payload,
      resolve,
    };

    listeners.forEach((listener) => listener(alert));
  });

export function showSuccessAlert(title, text = "") {
  return emitAlert({
    tone: "success",
    title,
    text,
    confirmButtonText: "Okay",
    kind: "notice",
  });
}

export function showErrorAlert(title, text = "") {
  return emitAlert({
    tone: "error",
    title,
    text,
    confirmButtonText: "Close",
    kind: "notice",
  });
}

export function showInfoAlert(title, text = "") {
  return emitAlert({
    tone: "info",
    title,
    text,
    confirmButtonText: "Got it",
    kind: "notice",
  });
}

export function showConfirmAlert({
  title,
  text,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  tone = "warning",
}) {
  return emitAlert({
    tone,
    title,
    text,
    confirmButtonText,
    cancelButtonText,
    kind: "confirm",
  });
}
