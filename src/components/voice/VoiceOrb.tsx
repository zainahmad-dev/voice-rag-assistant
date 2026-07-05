"use client";

import { Mic } from "lucide-react";

export type VoiceOrbState = "idle" | "listening" | "speaking";

interface VoiceOrbProps {
  state?: VoiceOrbState;
}

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

export function VoiceOrb({ state = "idle" }: VoiceOrbProps) {
  const isActive = state !== "idle";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-20 w-20 items-center justify-center">
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
          aria-label={
            state === "idle"
              ? "Start voice conversation"
              : "Voice conversation in progress"
          }
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition-colors duration-150 ${BUTTON_COLOR[state]}`}
        >
          <Mic size={24} />
        </button>
      </div>

      <span className="text-sm text-foreground-muted">
        {STATUS_LABEL[state]}
      </span>
    </div>
  );
}
