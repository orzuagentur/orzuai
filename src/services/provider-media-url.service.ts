import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeCachedSignedMediaUrl } from "@/services/media-url-cache.service";
import type { Database } from "@/types/database.types";
import { applyMediaCdnUrl } from "@/utils/media-cdn";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Long enough for delivery retries without re-signing on every attempt. */
export const PROVIDER_MEDIA_URL_TTL_SECONDS = 12 * 60 * 60;

export type ProviderReadyMediaUrl = {
  url: string;
  expiresAt: string;
};

type MessagingDbClient = SupabaseClient<Database>;

export async function ensureProviderReadyMediaUrl(
  storagePath: string,
  expiresIn = PROVIDER_MEDIA_URL_TTL_SECONDS,
): Promise<ProviderReadyMediaUrl | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("[provider-media-url] signed URL failed:", error?.message);
    return null;
  }

  const url = applyMediaCdnUrl(data.signedUrl);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await storeCachedSignedMediaUrl(storagePath, url, expiresAt);

  return {
    url,
    expiresAt,
  };
}

export function isProviderMediaUrlValid(
  url: string | null | undefined,
  expiresAt: string | null | undefined,
): url is string {
  if (!url?.trim() || !expiresAt) {
    return false;
  }

  return expiresAt > new Date().toISOString();
}

export async function resolveAttachmentProviderMediaUrl(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    storagePath: string;
    providerMediaUrl: string | null;
    providerMediaUrlExpiresAt: string | null;
  },
): Promise<string | null> {
  if (
    isProviderMediaUrlValid(
      input.providerMediaUrl,
      input.providerMediaUrlExpiresAt,
    )
  ) {
    return input.providerMediaUrl;
  }

  const refreshed = await ensureProviderReadyMediaUrl(input.storagePath);

  if (!refreshed) {
    return null;
  }

  await admin
    .from("message_attachments")
    .update({
      provider_media_url: refreshed.url,
      provider_media_url_expires_at: refreshed.expiresAt,
    })
    .eq("message_id", input.messageId);

  return refreshed.url;
}
