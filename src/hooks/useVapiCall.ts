"use client";

import { useCallback, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import Vapi from "@vapi-ai/web";

import { assistantConfig } from "@/lib/vapi/assistant";

export type VoiceOrbState = "idle" | "listening" | "speaking";

interface UseVapiCallResult {
  state: VoiceOrbState;
  error: string | null;
  toggleCall: () => void;
}

const dailyCreateCallObject = DailyIframe.createCallObject.bind(DailyIframe);
let isDailyCreateCallObjectPatched = false;

function patchDailyNoiseCancellation() {
  if (isDailyCreateCallObjectPatched) {
    return;
  }

  DailyIframe.createCallObject = ((...args: Parameters<typeof DailyIframe.createCallObject>) => {
    const call = dailyCreateCallObject(...args);
    const originalUpdateInputSettings = call.updateInputSettings.bind(call);

    call.updateInputSettings = ((settings: Parameters<typeof call.updateInputSettings>[0]) => {
      if (settings?.audio?.processor?.type === "noise-cancellation") {
        console.warn("[Vapi] Skipping Daily noise-cancellation setup to avoid Krisp worklet errors.");
        return Promise.resolve();
      }

      return originalUpdateInputSettings(settings);
    }) as typeof call.updateInputSettings;

    return call;
  }) as typeof DailyIframe.createCallObject;

  isDailyCreateCallObjectPatched = true;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const nested = (error as { error?: { message?: string } }).error?.message;
    const direct = (error as { message?: string }).message;
    if (nested) return nested;
    if (direct) return direct;
  }

  return "The voice call ran into a problem. Please try again.";
}

/**
 * Owns the VAPI Web SDK client and starts/stops a call with our inline
 * assistant config each time it's toggled. The client is created lazily, on
 * the first toggle, so it's only ever constructed from a user gesture (a
 * click) rather than during render.
 *
 * `state` mirrors VAPI's own call lifecycle events rather than just whether a
 * call is active: `call-start` (VAPI signals it's ready and listening) maps
 * to "listening", `speech-start`/`speech-end` (the assistant's own audio
 * level crossing a threshold) toggle "speaking" back to "listening", and
 * `call-end` or `error` reset to "idle". `error` surfaces the last call
 * error so the UI can show it instead of silently going quiet.
 */
export function useVapiCall(): UseVapiCallResult {
  const vapiRef = useRef<Vapi | null>(null);
  const isStartingRef = useRef(false);
  const stopRequestedWhileStartingRef = useRef(false);
  const [state, setState] = useState<VoiceOrbState>("idle");
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (vapiRef.current) return vapiRef.current;

    patchDailyNoiseCancellation();

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY environment variable.");
    }

    const vapi = new Vapi(publicKey);

    vapi.on("call-start", () => {
      setError(null);
      setState("listening");
    });

    vapi.on("speech-start", () => setState("speaking"));

    vapi.on("speech-end", () => setState("listening"));

    vapi.on("call-end", () => setState("idle"));

    vapi.on("error", (callError) => {
      console.error("VAPI call error:", callError);
      setError(extractErrorMessage(callError));
      setState("idle");
    });

    vapiRef.current = vapi;
    return vapi;
  }, []);

  const toggleCall = useCallback(() => {
    const vapi = getClient();

    if (isStartingRef.current) {
      stopRequestedWhileStartingRef.current = true;
      return;
    }

    if (state !== "idle") {
      vapi.stop();
      setState("idle");
    } else {
      isStartingRef.current = true;
      stopRequestedWhileStartingRef.current = false;
      setError(null);

      vapi
        .start(assistantConfig)
        .then((call) => {
          if (stopRequestedWhileStartingRef.current) {
            vapi.stop();
            setState("idle");
            return;
          }

          if (!call) {
            setState("idle");
          }
          // Otherwise the `call-start` event flips us to "listening" once
          // VAPI confirms it's actually ready, rather than assuming so here.
        })
        .catch((startError: unknown) => {
          console.error("VAPI failed to start call:", startError);
          setError(extractErrorMessage(startError));
          setState("idle");
        })
        .finally(() => {
          isStartingRef.current = false;
          stopRequestedWhileStartingRef.current = false;
        });
    }
  }, [getClient, state]);

  return { state, error, toggleCall };
}
