"use client";

const PERSISTED_URL_STORAGE_KEY = "orzuai:chat-media-urls:v1";
const MEDIA_BLOB_CACHE_NAME = "orzuai-chat-media-v1";
const PERSISTED_URL_TTL_MS = 50 * 60 * 1000;
const MAX_PERSISTED_URL_ENTRIES = 400;

type PersistedUrlEntry = {
  url: string;
  expiresAt: number;
};

type PersistedUrlStore = Record<string, PersistedUrlEntry>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readPersistedUrlStore(): PersistedUrlStore {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PERSISTED_URL_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as PersistedUrlStore;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistedUrlStore(store: PersistedUrlStore): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(PERSISTED_URL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable — memory cache still works.
  }
}

function prunePersistedUrlStore(store: PersistedUrlStore): PersistedUrlStore {
  const now = Date.now();
  const pruned: PersistedUrlStore = {};

  for (const [key, entry] of Object.entries(store)) {
    if (entry.expiresAt > now) {
      pruned[key] = entry;
    }
  }

  const entries = Object.entries(pruned);

  if (entries.length <= MAX_PERSISTED_URL_ENTRIES) {
    return pruned;
  }

  entries.sort((left, right) => left[1].expiresAt - right[1].expiresAt);

  return Object.fromEntries(entries.slice(-MAX_PERSISTED_URL_ENTRIES));
}

export function getPersistedMediaUrl(storagePath: string): string | null {
  const entry = readPersistedUrlStore()[storagePath];

  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.url;
}

export function setPersistedMediaUrl(
  storagePath: string,
  url: string,
  ttlMs = PERSISTED_URL_TTL_MS,
): void {
  const store = prunePersistedUrlStore(readPersistedUrlStore());

  store[storagePath] = {
    url,
    expiresAt: Date.now() + ttlMs,
  };

  writePersistedUrlStore(prunePersistedUrlStore(store));
}

export function hydratePersistedMediaUrls(
  apply: (storagePath: string, url: string) => void,
): void {
  const store = prunePersistedUrlStore(readPersistedUrlStore());
  const now = Date.now();
  let changed = false;

  for (const [storagePath, entry] of Object.entries(store)) {
    if (entry.expiresAt <= now) {
      delete store[storagePath];
      changed = true;
      continue;
    }

    apply(storagePath, entry.url);
  }

  if (changed) {
    writePersistedUrlStore(store);
  }
}

function buildMediaBlobCacheRequest(storagePath: string): Request {
  return new Request(
    `https://orzuai.local/chat-media/${encodeURIComponent(storagePath)}`,
  );
}

function isCacheApiAvailable(): boolean {
  return isBrowser() && "caches" in window;
}

export async function getCachedMediaBlobUrl(
  storagePath: string,
): Promise<string | null> {
  if (!isCacheApiAvailable()) {
    return null;
  }

  try {
    const cache = await caches.open(MEDIA_BLOB_CACHE_NAME);
    const response = await cache.match(buildMediaBlobCacheRequest(storagePath));

    if (!response) {
      return null;
    }

    const blob = await response.blob();

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function storeMediaBlobFromUrl(
  storagePath: string,
  signedUrl: string,
): Promise<string | null> {
  if (!isCacheApiAvailable() || !storagePath || !signedUrl) {
    return null;
  }

  try {
    const response = await fetch(signedUrl, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const cache = await caches.open(MEDIA_BLOB_CACHE_NAME);
    const blob = await response.blob();

    await cache.put(
      buildMediaBlobCacheRequest(storagePath),
      new Response(blob, {
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/octet-stream",
        },
      }),
    );

    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function warmMediaBlobCache(
  storagePath: string,
  signedUrl: string,
): Promise<void> {
  if (!isCacheApiAvailable()) {
    return;
  }

  try {
    const cache = await caches.open(MEDIA_BLOB_CACHE_NAME);
    const existing = await cache.match(buildMediaBlobCacheRequest(storagePath));

    if (existing) {
      return;
    }
  } catch {
    return;
  }

  void storeMediaBlobFromUrl(storagePath, signedUrl).then((blobUrl) => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  });
}
