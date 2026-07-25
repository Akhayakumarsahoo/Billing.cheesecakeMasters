"use client";

import { useEffect } from "react";

export function WebVitalsMonitor() {
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    // Monitor Long Tasks (> 50ms main-thread blocks)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(
              `[Perf / Main Thread] Long Task detected: ${Math.round(entry.duration)}ms`,
              entry
            );
          }
        }
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
          if (fid > 100) {
            console.warn(`[Perf / Web Vitals] High FID detected: ${Math.round(fid)}ms (Target <= 100ms)`);
          } else {
            console.log(`[Perf / Web Vitals] FID: ${Math.round(fid)}ms (Good <= 100ms)`);
          }
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });

      return () => {
        longTaskObserver.disconnect();
        fidObserver.disconnect();
      };
    } catch {
      // PerformanceObserver type might not be supported in older/mock browsers
    }
  }, []);

  return null;
}
