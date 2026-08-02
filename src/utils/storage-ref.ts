/**
 * Storage provider references (client-safe, no server imports).
 *
 * A stored media "path" can point to one of two providers:
 *   - Cloudflare R2  -> ref is prefixed with `r2::` (e.g. `r2::biz/conv/file.jpg`)
 *   - Supabase       -> plain path with no prefix (legacy + fallback)
 *
 * The prefix always stays at the very front of the string, so path builders
 * that only manipulate the segment after the last `/` (thumbnail/ogg paths)
 * transparently keep the provider. Any code that needs the raw object key or
 * the logical `businessId/...` path must call `getStorageObjectKey` first.
 */
export const R2_STORAGE_REF_PREFIX = "r2::";

export function isR2StorageRef(ref: string | null | undefined): boolean {
  return typeof ref === "string" && ref.startsWith(R2_STORAGE_REF_PREFIX);
}

export function toR2StorageRef(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  return `${R2_STORAGE_REF_PREFIX}${normalized}`;
}

/** Returns the raw object key (R2 key or Supabase path) without provider prefix. */
export function getStorageObjectKey(ref: string): string {
  return isR2StorageRef(ref)
    ? ref.slice(R2_STORAGE_REF_PREFIX.length)
    : ref;
}

/**
 * Builds a derived ref (thumbnail, transcoded audio, ...) that inherits the
 * provider of its parent, given the derived object's raw key.
 */
export function deriveStorageRef(parentRef: string, derivedKey: string): string {
  return isR2StorageRef(parentRef)
    ? toR2StorageRef(getStorageObjectKey(derivedKey))
    : getStorageObjectKey(derivedKey);
}
