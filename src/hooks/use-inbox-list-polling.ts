"use client";

import { useEffect, useRef } from "react";

export const INBOX_LIST_POLL_INTERVAL_MS = 30_000;
export const INBOX_LIST_POLL_FALLBACK_INTERVAL_MS = 120_000;

type UseInboxListPollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useInboxListPolling(
  onPoll: () => void | Promise<void>,
  options: UseInboxListPollingOptions | number = {},
) {
  const resolvedOptions =
    typeof options === "number" ? { intervalMs: options } : options;
  const enabled = resolvedOptions.enabled ?? true;
  const intervalMs =
    resolvedOptions.intervalMs ?? INBOX_LIST_POLL_INTERVAL_MS;
  const onPollRef = useRef(onPoll);
  const isPollingRef = useRef(false);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const tick = async () => {
      if (
        document.visibilityState !== "visible" ||
        isPollingRef.current
      ) {
        return;
      }

      isPollingRef.current = true;

      try {
        await onPollRef.current();
      } finally {
        isPollingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs]);
}
