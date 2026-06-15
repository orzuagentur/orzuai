"use client";

import { useEffect, useState } from "react";

/** True after realtime has been disconnected for at least `delayMs`. */
export function useRealtimeFallbackReady(
  isConnected: boolean,
  enabled: boolean,
  delayMs = 10_000,
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || isConnected) {
      setReady(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReady(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, enabled, isConnected]);

  return ready;
}
