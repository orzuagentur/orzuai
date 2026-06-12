type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type SessionCache<T> = {
  get: (key: string) => T | null;
  peek: (key: string) => T | null;
  set: (key: string, value: T, ttlMs?: number) => void;
  isFresh: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;
};

export function createSessionCache<T>(defaultTtlMs: number): SessionCache<T> {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string) {
      const entry = store.get(key);

      if (!entry) {
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }

      return entry.value;
    },

    peek(key: string) {
      return store.get(key)?.value ?? null;
    },

    set(key: string, value: T, ttlMs = defaultTtlMs) {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },

    isFresh(key: string) {
      const entry = store.get(key);
      return Boolean(entry && Date.now() <= entry.expiresAt);
    },

    delete(key: string) {
      store.delete(key);
    },

    clear() {
      store.clear();
    },
  };
}
