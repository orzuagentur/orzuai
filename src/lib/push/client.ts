"use client";

const SW_PATH = "/sw.js";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }

  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

export async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);

  if (existing) {
    return existing;
  }

  return registerPushServiceWorker();
}

export async function fetchPushConfig(): Promise<{
  enabled: boolean;
  vapidPublicKey: string | null;
}> {
  const response = await fetch("/api/push/config", { cache: "no-store" });

  if (!response.ok) {
    return { enabled: false, vapidPublicKey: null };
  }

  return (await response.json()) as {
    enabled: boolean;
    vapidPublicKey: string | null;
  };
}

export async function subscribeToPushNotifications(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  const registration = await getPushServiceWorkerRegistration();

  if (!registration) {
    return null;
  }

  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    return existing;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      vapidPublicKey,
    ) as BufferSource,
  });
}

export async function savePushSubscription(
  subscription: PushSubscription,
): Promise<boolean> {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    }),
  });

  return response.ok;
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  const registration = await getPushServiceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  const endpoint = subscription.endpoint;
  const response = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    return false;
  }

  return subscription.unsubscribe();
}

export function playLeadNotificationSound(
  soundPath = "/sounds/new-lead.wav",
): void {
  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.85;
    void audio.play();
  } catch {
    // Browsers may block autoplay without prior user interaction.
  }
}
