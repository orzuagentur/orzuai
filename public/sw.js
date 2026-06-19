const LEAD_SOUND_PATH = "/sounds/new-lead.wav";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "New message",
    body: "You have a new message in OrzuX.",
    url: "/dashboard/chats",
    tag: "inbound-message",
    sound: LEAD_SOUND_PATH,
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Keep defaults when payload is invalid.
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon.png",
        badge: "/icon.png",
        tag: data.tag,
        renotify: true,
        silent: false,
        vibrate: [180, 80, 180],
        data: {
          url: data.url,
          sound: data.sound || LEAD_SOUND_PATH,
        },
      });

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const sound = data.sound || LEAD_SOUND_PATH;

      for (const client of clients) {
        client.postMessage({
          type: "PLAY_LEAD_SOUND",
          sound,
        });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({ type: "OPEN_URL", url: targetUrl });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
