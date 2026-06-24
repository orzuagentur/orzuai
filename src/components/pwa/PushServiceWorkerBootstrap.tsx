"use client";

import { useEffect } from "react";

import {
  ensurePushServiceWorkerReady,
  isPushSupported,
  playLeadNotificationSound,
  playManagerCalloutSound,
  syncPushSubscriptionToServer,
} from "@/lib/push/client";
import { isManagerCalloutSound } from "@/lib/push/notification-sounds";

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
        if (isManagerCalloutSound(data.sound)) {
          playManagerCalloutSound(data.sound);
        } else {
          playLeadNotificationSound(data.sound);
        }
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
