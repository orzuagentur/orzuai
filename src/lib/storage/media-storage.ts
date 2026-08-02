import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";
import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isR2Configured,
  r2DeleteObject,
  r2GetObjectBuffer,
  r2GetPresignedDownloadUrl,
  r2GetPresignedUploadUrl,
  r2ObjectExists,
  r2PutObject,
} from "@/lib/storage/r2";
import { applyMediaCdnUrl } from "@/utils/media-cdn";
import {
  getStorageObjectKey,
  isR2StorageRef,
  toR2StorageRef,
} from "@/utils/storage-ref";

/**
 * Provider-aware media storage.
 *
 * New objects are written to Cloudflare R2 (private) when R2 is configured and
 * recorded as `r2::`-prefixed refs. Existing Supabase objects keep working: any
 * ref without the prefix is read/written through Supabase Storage. This gives a
 * zero-downtime, backward-compatible migration path.
 *
 * All customer media lives in the private R2 `media` bucket and is served via
 * short-lived presigned URLs.
 */

/**
 * Returns the storage ref to use for a freshly created object at `logicalKey`.
 * R2 when configured, otherwise a plain Supabase path.
 */
function isR2MediaBucketReady(): boolean {
  return (
    isR2Configured() &&
    Boolean(process.env[ENV_KEYS.R2_BUCKET_MEDIA]?.trim())
  );
}

export function newMediaObjectRef(logicalKey: string): string {
  const normalized = logicalKey.replace(/^\/+/, "");
  return isR2MediaBucketReady() ? toR2StorageRef(normalized) : normalized;
}

/** Uploads bytes to the provider encoded in `ref`. Returns `true` on success. */
export async function putMediaObject(input: {
  ref: string;
  body: Buffer;
  contentType: string;
  upsert?: boolean;
}): Promise<boolean> {
  const contentType = input.contentType || "application/octet-stream";

  if (isR2StorageRef(input.ref)) {
    return r2PutObject({
      bucket: "media",
      key: getStorageObjectKey(input.ref),
      body: input.body,
      contentType,
    });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(getStorageObjectKey(input.ref), input.body, {
      contentType,
      upsert: input.upsert ?? false,
    });

  if (error) {
    console.error("[media-storage] supabase upload failed:", error.message);
    return false;
  }

  return true;
}

/**
 * Presigned PUT URL for direct browser upload. Returns `null` for Supabase refs
 * (those use the authenticated Supabase client upload instead of a presigned URL).
 */
export async function createMediaUploadUrl(input: {
  ref: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string | null> {
  if (!isR2StorageRef(input.ref)) {
    return null;
  }

  return r2GetPresignedUploadUrl({
    bucket: "media",
    key: getStorageObjectKey(input.ref),
    contentType: input.contentType || "application/octet-stream",
    expiresInSeconds: input.expiresInSeconds,
  });
}

/** Short-lived read URL for the object referenced by `ref`. */
export async function getMediaSignedUrl(
  ref: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (isR2StorageRef(ref)) {
    return r2GetPresignedDownloadUrl({
      bucket: "media",
      key: getStorageObjectKey(ref),
      expiresInSeconds,
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(ref, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("[media-storage] supabase signed URL failed:", error?.message);
    return null;
  }

  return applyMediaCdnUrl(data.signedUrl);
}

/** Downloads the referenced object into a Buffer. */
export async function downloadMediaObject(ref: string): Promise<Buffer | null> {
  if (isR2StorageRef(ref)) {
    return r2GetObjectBuffer({ bucket: "media", key: getStorageObjectKey(ref) });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .download(ref);

  if (error || !data) {
    console.error("[media-storage] supabase download failed:", error?.message);
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

/** Deletes the referenced object (best effort). */
export async function deleteMediaObject(ref: string): Promise<boolean> {
  if (isR2StorageRef(ref)) {
    return r2DeleteObject({ bucket: "media", key: getStorageObjectKey(ref) });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .remove([ref]);

  return !error;
}

/** Checks whether the referenced object exists. */
export async function mediaObjectExists(ref: string): Promise<boolean> {
  if (isR2StorageRef(ref)) {
    return r2ObjectExists({ bucket: "media", key: getStorageObjectKey(ref) });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(ref, 60);

  return !error && Boolean(data?.signedUrl);
}
