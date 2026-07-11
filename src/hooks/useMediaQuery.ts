"use client";

import { useSyncExternalStore } from "react";

function subscribeFactory(query: string) {
  return (callback: () => void) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList.removeEventListener("change", callback);
  };
}

/**
 * Tracks a media query via useSyncExternalStore so the server snapshot
 * (false) and the first client render agree — no hydration warning — and
 * the real value takes over as soon as React can read window.matchMedia.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeFactory(query),
    () => window.matchMedia(query).matches,
    () => false
  );
}
