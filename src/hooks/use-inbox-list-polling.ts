"use client";

import { useEffect, useRef } from "react";

export const INBOX_LIST_POLL_INTERVAL_MS = 15_000;

export function useInboxListPolling(
  onPoll: () => void | Promise<void>,
  intervalMs = INBOX_LIST_POLL_INTERVAL_MS,
) {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void onPollRef.current();
    };

    const intervalId = window.setInterval(tick, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs]);
}
