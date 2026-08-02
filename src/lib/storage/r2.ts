import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ENV_KEYS } from "@/constants/env-keys";

/**
 * Cloudflare R2 storage (S3-compatible, no egress fees).
 *
 * Every function fails gracefully when R2 is not configured: puts/deletes return
 * `false`, presign returns `null`. This lets us ship the integration and enable
 * it purely via env vars, without breaking anything when R2 is absent.
 *
 * Buckets:
 *   - "media"       -> R2_BUCKET_MEDIA       (chat attachments, avatars, KB files)
 *   - "recordings"  -> R2_BUCKET_RECORDINGS  (call recordings, transcripts, backups)
 */
export type R2Bucket = "media" | "recordings";

let client: S3Client | null = null;
let unavailable = false;

export function isR2Configured(): boolean {
  return Boolean(
    process.env[ENV_KEYS.R2_ACCOUNT_ID]?.trim() &&
      process.env[ENV_KEYS.R2_ACCESS_KEY_ID]?.trim() &&
      process.env[ENV_KEYS.R2_SECRET_ACCESS_KEY]?.trim(),
  );
}

/**
 * Public base URL for the media bucket (r2.dev or a custom Cloudflare domain),
 * configured via `R2_PUBLIC_MEDIA_URL`. Returns `null` when not set.
 */
export function getR2PublicMediaBaseUrl(): string | null {
  const base = process.env[ENV_KEYS.R2_PUBLIC_MEDIA_URL]?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

/** Builds a stable public URL for a media-bucket object, or `null` if no public base is set. */
export function getR2PublicUrl(key: string): string | null {
  const base = getR2PublicMediaBaseUrl();

  if (!base) {
    return null;
  }

  const normalizedKey = key.replace(/^\/+/, "");
  return `${base}/${normalizedKey}`;
}

function getR2Client(): S3Client | null {
  if (unavailable) {
    return null;
  }

  const accountId = process.env[ENV_KEYS.R2_ACCOUNT_ID]?.trim();
  const accessKeyId = process.env[ENV_KEYS.R2_ACCESS_KEY_ID]?.trim();
  const secretAccessKey = process.env[ENV_KEYS.R2_SECRET_ACCESS_KEY]?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    unavailable = true;
    return null;
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return client;
}

function resolveBucketName(bucket: R2Bucket): string | null {
  const name =
    bucket === "recordings"
      ? process.env[ENV_KEYS.R2_BUCKET_RECORDINGS]?.trim()
      : process.env[ENV_KEYS.R2_BUCKET_MEDIA]?.trim();

  return name || null;
}

/** Uploads an object. Returns `true` on success, `false` when R2 is unavailable/failed. */
export async function r2PutObject(input: {
  bucket: R2Bucket;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}): Promise<boolean> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return false;
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return true;
  } catch (error) {
    console.error("[r2] put failed", error);
    return false;
  }
}

/** Downloads an object into a Buffer. Returns `null` when unavailable/missing. */
export async function r2GetObjectBuffer(input: {
  bucket: R2Bucket;
  key: string;
}): Promise<Buffer | null> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return null;
  }

  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: input.key }),
    );

    const body = result.Body as
      | { transformToByteArray?: () => Promise<Uint8Array> }
      | undefined;

    if (!body?.transformToByteArray) {
      return null;
    }

    return Buffer.from(await body.transformToByteArray());
  } catch (error) {
    console.error("[r2] get object failed", error);
    return null;
  }
}

/** Returns `true` when the object exists. `false` when missing or unavailable. */
export async function r2ObjectExists(input: {
  bucket: R2Bucket;
  key: string;
}): Promise<boolean> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return false;
  }

  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: input.key }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Presigned GET URL for private download. Returns `null` when unavailable. */
export async function r2GetPresignedDownloadUrl(input: {
  bucket: R2Bucket;
  key: string;
  expiresInSeconds?: number;
}): Promise<string | null> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return null;
  }

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: input.key }),
      { expiresIn: input.expiresInSeconds ?? 3600 },
    );
  } catch (error) {
    console.error("[r2] presign download failed", error);
    return null;
  }
}

/** Presigned PUT URL for direct client-side upload. Returns `null` when unavailable. */
export async function r2GetPresignedUploadUrl(input: {
  bucket: R2Bucket;
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}): Promise<string | null> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return null;
  }

  try {
    return await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: input.key,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresInSeconds ?? 900 },
    );
  } catch (error) {
    console.error("[r2] presign upload failed", error);
    return null;
  }
}

/** Deletes an object. Returns `true` on success, `false` when unavailable/failed. */
export async function r2DeleteObject(input: {
  bucket: R2Bucket;
  key: string;
}): Promise<boolean> {
  const s3 = getR2Client();
  const bucketName = resolveBucketName(input.bucket);

  if (!s3 || !bucketName) {
    return false;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: input.key }),
    );
    return true;
  } catch (error) {
    console.error("[r2] delete failed", error);
    return false;
  }
}
