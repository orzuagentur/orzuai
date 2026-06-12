import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { applyMediaCdnUrl } from "@/utils/media-cdn";

export async function getCachedSignedMediaUrl(
  storagePath: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: cached } = await admin
    .from("media_signed_url_cache")
    .select("signed_url, expires_at")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (cached?.signed_url && cached.expires_at > now) {
    return applyMediaCdnUrl(cached.signed_url);
  }

  return null;
}

export async function storeCachedSignedMediaUrl(
  storagePath: string,
  signedUrl: string,
  expiresAt: string,
): Promise<void> {
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
