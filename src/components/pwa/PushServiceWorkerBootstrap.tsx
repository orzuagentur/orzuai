"use client";

import { useEffect } from "react";

import {
  ensurePushServiceWorkerReady,
  isPushSupported,
  playLeadNotificationSound,
  syncPushSubscriptionToServer,
} from "@/lib/push/client";

/**
 * Registers the push service worker as early as possible (any page load),
 * so push events work before the user opens the dashboard.
 */
export function PushServiceWorkerBootstrap() {
  useEffect(() => {
    if (!isPushSupported()) {
      return;
    }

    void ensurePushServiceWorkerReady().then(() => syncPushSubscriptionToServer());

    function handleServiceWorkerMessage(event: MessageEvent) {
      const data = event.data as
        | { type?: string; sound?: string; url?: string }
        | undefined;

      if (data?.type === "PLAY_LEAD_SOUND") {
        playLeadNotificationSound(data.sound);
      }

      if (data?.type === "OPEN_URL" && typeof data.url === "string") {
        window.location.assign(data.url);
      }
    }

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, []);

  return null;
}
