import "server-only";

import {
  buildMediaUrlRedisKey,
  getRedisCacheValue,
  setRedisCacheValue,
} from "@/lib/cache/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMediaCdnUrl } from "@/utils/media-cdn";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getCachedSignedMediaUrl(
  storagePath: string,
): Promise<string | null> {
  const redisKey = buildMediaUrlRedisKey(storagePath);
  const redisCached = await getRedisCacheValue(redisKey);

  if (redisCached) {
    return applyMediaCdnUrl(redisCached);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: cached } = await admin
    .from("media_signed_url_cache")
    .select("signed_url, expires_at")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (cached?.signed_url && cached.expires_at > now) {
    const signedUrl = applyMediaCdnUrl(cached.signed_url);
    void setRedisCacheValue(redisKey, signedUrl, SIGNED_URL_TTL_SECONDS);
    return signedUrl;
  }

  return null;
}

export async function storeCachedSignedMediaUrl(
  storagePath: string,
  signedUrl: string,
  expiresAt: string,
): Promise<void> {
  const redisKey = buildMediaUrlRedisKey(storagePath);
  const ttlSeconds = Math.max(
    60,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );

  void setRedisCacheValue(redisKey, signedUrl, ttlSeconds);

  const admin = createAdminClient();

  const { error } = await admin.from("media_signed_url_cache").upsert(
    {
      storage_path: storagePath,
      signed_url: signedUrl,
      expires_at: expiresAt,
    },
    { onConflict: "storage_path" },
  );

  if (error) {
    console.error("[media-cache] store failed", error.message);
  }
}
