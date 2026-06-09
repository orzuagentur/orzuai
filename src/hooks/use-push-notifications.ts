"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchPushConfig,
  isPushSupported,
  playLeadNotificationSound,
  registerPushServiceWorker,
  savePushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/push/client";

type PushPermission = NotificationPermission | "unsupported";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [enabledOnServer, setEnabledOnServer] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshState = useCallback(async () => {
    const pushSupported = isPushSupported();
    setSupported(pushSupported);

    if (!pushSupported) {
      setPermission("unsupported");
      setSubscribed(false);
      setEnabledOnServer(false);
      setLoading(false);
      return;
    }

    const config = await fetchPushConfig();
    setEnabledOnServer(config.enabled);
    setPermission(Notification.permission);

    const registration = await registerPushServiceWorker();
    const subscription = await registration?.pushManager.getSubscription();
    setSubscribed(Boolean(subscription && config.enabled));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!supported) {
      return;
    }

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

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || busy) {
      return false;
    }

    setBusy(true);

    try {
      const config = await fetchPushConfig();

      if (!config.enabled || !config.vapidPublicKey) {
        return false;
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        return false;
      }

      const subscription = await subscribeToPushNotifications(
        config.vapidPublicKey,
      );

      if (!subscription) {
        return false;
      }

      const saved = await savePushSubscription(subscription);
      setSubscribed(saved);
      return saved;
    } finally {
      setBusy(false);
    }
  }, [busy, supported]);

  const disable = useCallback(async () => {
    if (!supported || busy) {
      return false;
    }

    setBusy(true);

    try {
      const success = await unsubscribeFromPushNotifications();
      setSubscribed(!success ? subscribed : false);
      return success;
    } finally {
      setBusy(false);
    }
  }, [busy, subscribed, supported]);

  return {
    supported,
    enabledOnServer,
    permission,
    subscribed,
    loading,
    busy,
    enable,
    disable,
    refreshState,
  };
}
