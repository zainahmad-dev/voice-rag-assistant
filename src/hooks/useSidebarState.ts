"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useMediaQuery } from "./useMediaQuery";

const STORAGE_KEY = "sidebar-collapsed";
const DESKTOP_QUERY = "(min-width: 768px)";

// Mirrors the module-level store pattern in ThemeToggleButton: the
// collapsed flag is synced through localStorage like an external system via
// useSyncExternalStore, rather than mirrored into local state — so reading
// the persisted value on mount needs no effect at all.
const listeners = new Set<() => void>();

function getCollapsedSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function subscribeCollapsed(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function persistCollapsed(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

interface UseSidebarStateResult {
  /** Icon-rail vs full width, persisted — applies at tablet/desktop widths. */
  isCollapsed: boolean;
  /** Slide-in drawer visibility — applies below the tablet breakpoint. */
  isMobileOpen: boolean;
  /** Whether the document list is actually visible right now, for aria-expanded. */
  isSidebarVisible: boolean;
  toggle: () => void;
  closeMobile: () => void;
}

/**
 * One hamburger button drives two different behaviors depending on
 * viewport: it collapses/expands the persisted icon rail on tablet+desktop,
 * or opens/closes the transient slide-in drawer on mobile.
 */
export function useSidebarState(): UseSidebarStateResult {
  const isCollapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isDesktopOrTablet = useMediaQuery(DESKTOP_QUERY);

  // Close the drawer if a resize/rotation crosses into the tablet/desktop
  // layout, so it doesn't reappear open if the viewport later narrows again.
  useEffect(() => {
    const mediaQueryList = window.matchMedia(DESKTOP_QUERY);
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) setIsMobileOpen(false);
    }
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  const toggle = useCallback(() => {
    if (isDesktopOrTablet) {
      persistCollapsed(!getCollapsedSnapshot());
    } else {
      setIsMobileOpen((prev) => !prev);
    }
  }, [isDesktopOrTablet]);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return {
    isCollapsed,
    isMobileOpen,
    isSidebarVisible: isDesktopOrTablet ? !isCollapsed : isMobileOpen,
    toggle,
    closeMobile,
  };
}
