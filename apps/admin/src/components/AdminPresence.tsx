"use client";

import { useEffect } from "react";

import { PRESENCE_HEARTBEAT_MS } from "@/features/team/presence";
import { touchPresenceAction } from "@/features/team/presence-actions";

export function AdminPresence() {
  useEffect(() => {
    let active = true;

    async function heartbeat() {
      if (!active) {
        return;
      }

      await touchPresenceAction();
    }

    void heartbeat();

    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, PRESENCE_HEARTBEAT_MS);

    function handlePageHide() {
      const payload = new Blob([], { type: "application/json" });
      navigator.sendBeacon("/api/presence/offline", payload);
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", handlePageHide);
      navigator.sendBeacon("/api/presence/offline", new Blob());
    };
  }, []);

  return null;
}
