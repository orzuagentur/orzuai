"use client";

import { useEffect, useRef } from "react";

export const INBOX_LIST_POLL_INTERVAL_MS = 15_000;

export function useInboxListPolling(
  onPoll: () => void | Promise<void>,
  intervalMs = INBOX_LIST_POLL_INTERVAL_MS,
) {
  const onPollRef = useRef(onPoll);
  const isPollingRef = useRef(false);
  onPollRef.current = onPoll;

  useEffect(() => {
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
  }, [intervalMs]);
}
