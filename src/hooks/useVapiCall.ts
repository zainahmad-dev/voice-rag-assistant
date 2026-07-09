"use client";

import { useCallback, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import Vapi from "@vapi-ai/web";

import { assistantConfig } from "@/lib/vapi/assistant";

interface UseVapiCallResult {
  isCallActive: boolean;
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

/**
 * Owns the VAPI Web SDK client and starts/stops a call with our inline
 * assistant config each time it's toggled. The client is created lazily, on
 * the first toggle, so it's only ever constructed from a user gesture (a
 * click) rather than during render.
 *
 * Listens for `call-end`/`error` just enough to reset `isCallActive` if VAPI
 * tears the call down on its own — otherwise the orb would stay stuck
 * showing "Listening…" after a failed or dropped call. Full state (speaking,
 * user-visible error messages) comes in a later phase.
 */
export function useVapiCall(): UseVapiCallResult {
  const vapiRef = useRef<Vapi | null>(null);
  const isStartingRef = useRef(false);
  const stopRequestedWhileStartingRef = useRef(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const getClient = useCallback(() => {
    if (vapiRef.current) return vapiRef.current;

    patchDailyNoiseCancellation();

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY environment variable.");
    }

    const vapi = new Vapi(publicKey);
    vapi.on("call-end", () => setIsCallActive(false));
    vapi.on("error", (error) => {
      console.error("VAPI call error:", error);
      setIsCallActive(false);
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

    if (isCallActive) {
      vapi.stop();
      setIsCallActive(false);
    } else {
      isStartingRef.current = true;
      stopRequestedWhileStartingRef.current = false;

      vapi
        .start(assistantConfig)
        .then(() => {
          if (stopRequestedWhileStartingRef.current) {
            vapi.stop();
            return;
          }

          setIsCallActive(true);
        })
        .catch((error: unknown) => {
          console.error("VAPI failed to start call:", error);
          setIsCallActive(false);
        })
        .finally(() => {
          isStartingRef.current = false;
          stopRequestedWhileStartingRef.current = false;
        });
    }
  }, [getClient, isCallActive]);

  return { isCallActive, toggleCall };
}
