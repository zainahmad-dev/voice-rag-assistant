"use client";

import { useEffect } from "react";

// Skipped in dev so Turbopack's HMR requests never get intercepted/cached
// by a stale service worker while iterating locally.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }, []);

  return null;
}
