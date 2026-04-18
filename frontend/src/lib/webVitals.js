function createPerformanceEntryObserver(type, callback) {
  if (!("PerformanceObserver" in window)) {
    return null;
  }

  try {
    const observer = new PerformanceObserver((entryList) => callback(entryList.getEntries()));
    observer.observe({ type, buffered: true });
    return observer;
  } catch {
    return null;
  }
}

export function setupWebVitalsMonitoring() {
  if (import.meta.env.DEV) {
    return;
  }

  createPerformanceEntryObserver("largest-contentful-paint", (entries) => {
    const lcp = entries.at(-1);
    if (!lcp) {
      return;
    }
    console.info("[Vitals] LCP(ms):", Math.round(lcp.startTime));
  });

  createPerformanceEntryObserver("first-input", (entries) => {
    const firstInput = entries.at(-1);
    if (!firstInput) {
      return;
    }
    const fid = firstInput.processingStart - firstInput.startTime;
    console.info("[Vitals] FID(ms):", Math.round(fid));
  });

  createPerformanceEntryObserver("layout-shift", (entries) => {
    const cls = entries
      .filter((entry) => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0);
    console.info("[Vitals] CLS:", Number(cls.toFixed(3)));
  });
}
