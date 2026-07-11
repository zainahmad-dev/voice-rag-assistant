"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

const DISMISSED_KEY = "install-prompt-dismissed";

// Mirrors the module-level store pattern in ThemeToggleButton/useSidebarState:
// "eligible" (not standalone, not previously dismissed) is read through
// useSyncExternalStore so the server snapshot (false) and the client's first
// render agree — no hydration mismatch — and the real value takes over once
// React can read window/localStorage.
const listeners = new Set<() => void>();

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function getEligibleSnapshot(): boolean {
  return !isStandalone() && window.localStorage.getItem(DISMISSED_KEY) !== "true";
}

function getEligibleServerSnapshot(): boolean {
  return false;
}

function subscribeEligible(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function dismiss() {
  window.localStorage.setItem(DISMISSED_KEY, "true");
  listeners.forEach((listener) => listener());
}

export function InstallPrompt() {
  const eligible = useSyncExternalStore(subscribeEligible, getEligibleSnapshot, getEligibleServerSnapshot);
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!eligible) return;

    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferredEvent(event);
    }

    function handleAppInstalled() {
      setDeferredEvent(null);
      dismiss();
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [eligible]);

  async function handleInstallClick() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    dismiss();
  }

  const showIosHint = eligible && !deferredEvent && isIosSafari();

  if (!eligible || (!deferredEvent && !showIosHint)) return null;

  return (
    <div className="flex justify-center border-b border-border bg-background px-4 py-3">
      <div className="animate-banner-in flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-background">
          <Download size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Install Voice RAG Assistant</p>
          <p className="text-xs text-foreground-muted">
            {deferredEvent
              ? "Add it to your home screen for quick, app-like access."
              : 'Tap Share, then "Add to Home Screen" for quick access.'}
          </p>
        </div>

        {deferredEvent && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-background transition-all duration-200 hover:scale-105 hover:bg-accent-hover active:scale-95"
          >
            Install
          </button>
        )}

        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-all duration-200 hover:bg-danger/10 hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
