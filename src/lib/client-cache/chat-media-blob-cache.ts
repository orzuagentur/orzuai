const DB_NAME = "orzuai-chat-media";
const STORE_NAME = "blobs";
const DB_VERSION = 1;
const TTL_MS = Math.round(7 * 1.7 * 24 * 60 * 60 * 1000);
const MAX_ENTRIES = Math.round(250 * 1.7);

type MediaBlobRecord = {
  key: string;
  blob: Blob;
  mimeType: string;
  savedAt: number;
};

const persistInFlight = new Map<string, Promise<void>>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = runner(store);

        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

async function pruneStore(): Promise<void> {
  const records = await runTransaction<MediaBlobRecord[]>("readonly", (store) =>
    store.getAll(),
  );

  const now = Date.now();
  const validRecords = records.filter(
    (record) => now - record.savedAt <= TTL_MS,
  );

  for (const record of records) {
    if (now - record.savedAt > TTL_MS) {
      await runTransaction("readwrite", (store) => store.delete(record.key));
    }
  }

  if (validRecords.length <= MAX_ENTRIES) {
    return;
  }

  const sorted = [...validRecords].sort((left, right) => left.savedAt - right.savedAt);
  const deleteCount = validRecords.length - MAX_ENTRIES;

  for (let index = 0; index < deleteCount; index += 1) {
    const record = sorted[index];

    if (record) {
      await runTransaction("readwrite", (store) => store.delete(record.key));
    }
  }
}

export async function hasPersistedMediaBlob(key: string): Promise<boolean> {
  if (!isBrowser() || !key) {
    return false;
  }

  try {
    const record = await runTransaction<MediaBlobRecord | undefined>(
      "readonly",
      (store) => store.get(key),
    );

    if (!record) {
      return false;
    }

    if (Date.now() - record.savedAt > TTL_MS) {
      await runTransaction("readwrite", (store) => store.delete(key));
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getPersistedMediaObjectUrl(
  key: string,
): Promise<string | null> {
  if (!isBrowser() || !key) {
    return null;
  }

  try {
    const record = await runTransaction<MediaBlobRecord | undefined>(
      "readonly",
      (store) => store.get(key),
    );

    if (!record) {
      return null;
    }

    if (Date.now() - record.savedAt > TTL_MS) {
      await runTransaction("readwrite", (store) => store.delete(key));
      return null;
    }

    return URL.createObjectURL(record.blob);
  } catch {
    return null;
  }
}

export async function persistMediaBlob(
  key: string,
  sourceUrl: string,
  mimeType = "application/octet-stream",
): Promise<void> {
  if (!isBrowser() || !key || !sourceUrl || sourceUrl.startsWith("blob:")) {
    return;
  }

  const existing = persistInFlight.get(key);

  if (existing) {
    await existing;
    return;
  }

  const task = (async () => {
    try {
      const response = await fetch(sourceUrl);

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();

      await runTransaction("readwrite", (store) =>
        store.put({
          key,
          blob,
          mimeType: blob.type || mimeType,
          savedAt: Date.now(),
        } satisfies MediaBlobRecord),
      );

      await pruneStore();
    } catch {
      // Ignore cache write failures — chat still works from signed URLs.
    } finally {
      persistInFlight.delete(key);
    }
  })();

  persistInFlight.set(key, task);
  await task;
}

export async function persistMediaBlobFromKeys(
  keys: string[],
  sourceUrl: string,
  mimeType?: string,
): Promise<void> {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];

  await Promise.all(
    uniqueKeys.map((key) => persistMediaBlob(key, sourceUrl, mimeType)),
  );
}
