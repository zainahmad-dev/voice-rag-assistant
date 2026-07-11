"use client";

import { Mic } from "lucide-react";

import { useVapiCall, type VoiceOrbState } from "@/hooks/useVapiCall";

const STATUS_LABEL: Record<VoiceOrbState, string> = {
  idle: "Tap to speak",
  listening: "Listening…",
  speaking: "Speaking…",
};

const RING_BORDER_COLOR: Record<VoiceOrbState, string> = {
  idle: "",
  listening: "border-accent",
  speaking: "border-secondary",
};

const BUTTON_COLOR: Record<VoiceOrbState, string> = {
  idle: "border-border bg-surface-raised text-foreground-muted",
  listening: "border-accent bg-accent text-background",
  speaking: "border-secondary bg-secondary text-background",
};

export function VoiceOrb() {
  const { state, error, toggleCall } = useVapiCall();
  const isActive = state !== "idle";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-20 w-20 items-center justify-center">
        {state === "idle" && (
          <span
            aria-hidden="true"
            className="orb-idle-glow absolute inset-0 rounded-full bg-accent-subtle blur-md"
          />
        )}

        {isActive && (
          <span
            aria-hidden="true"
            className={`orb-pulse absolute inset-0 rounded-full border-2 ${RING_BORDER_COLOR[state]}`}
            style={
              state === "speaking"
                ? { animationDuration: "var(--orb-speaking-duration)" }
                : undefined
            }
          />
        )}

        <button
          type="button"
          onClick={toggleCall}
          aria-label={
            state === "idle"
              ? "Start voice conversation"
              : "Voice conversation in progress"
          }
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 ${BUTTON_COLOR[state]} ${
            isActive ? "scale-105 shadow-lg" : "hover:scale-105 hover:border-accent/50"
          }`}
        >
          {state === "speaking" ? (
            <span aria-hidden="true" className="flex h-5 items-end gap-0.5">
              {[0, 1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className="orb-wave-bar h-full w-[3px] rounded-full bg-background"
                  style={{ animationDelay: `${bar * 0.12}s` }}
                />
              ))}
            </span>
          ) : (
            <Mic size={24} />
          )}
        </button>
      </div>

      <span className="text-sm text-foreground-muted">
        {STATUS_LABEL[state]}
      </span>

      {error && (
        <span role="alert" className="max-w-64 text-center text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
