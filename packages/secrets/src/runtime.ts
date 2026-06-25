const CACHE_TTL_MS = 60_000;

let secretCache = new Map<string, string>();
let cacheExpiresAt = 0;

export function clearSecretCache(): void {
  secretCache = new Map();
  cacheExpiresAt = 0;
}

export function applySecretCache(
  entries: Map<string, string>,
  ttlMs = CACHE_TTL_MS,
): void {
  secretCache = entries;
  cacheExpiresAt = Date.now() + ttlMs;
}

export function setCachedSecret(keyName: string, value: string): void {
  secretCache.set(keyName, value);
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export function deleteCachedSecret(keyName: string): void {
  secretCache.delete(keyName);
}

export function resolveSecretFromCache(keyName: string): string | undefined {
  if (Date.now() > cacheExpiresAt) {
    return undefined;
  }

  return secretCache.get(keyName);
}

/** Safe for middleware/edge — no Node crypto imports. */
export function resolveSecretValue(
  keyName: string,
  options?: { required?: boolean },
): string | undefined {
  const fromCache = resolveSecretFromCache(keyName);
  const fromEnv = process.env[keyName]?.trim();
  const value = fromCache ?? fromEnv;

  if (!value && options?.required) {
    throw new Error(`Missing required secret: ${keyName}`);
  }

  return value || undefined;
}
