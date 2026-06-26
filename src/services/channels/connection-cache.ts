import "server-only";

import { resolveIntegrationSecret } from "@/services/integration-secrets.service";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

type CacheEntry<T> = {
  value: T | null;
  expiresAt: number;
};

type WhatsAppDeliveryConnection = {
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
};

type TelegramDeliveryConnection = {
  bot_token: string | null;
};

const CACHE_TTL_MS = 60_000;
const whatsappCache = new Map<string, CacheEntry<WhatsAppDeliveryConnection>>();
const telegramCache = new Map<string, CacheEntry<TelegramDeliveryConnection>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null | undefined {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
}

function setCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T | null,
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function getCachedWhatsAppDeliveryConnection(
  admin: MessagingDbClient,
  businessId: string,
): Promise<WhatsAppDeliveryConnection | null> {
  const cached = getCached(whatsappCache, businessId);

  if (cached !== undefined) {
    return cached;
  }

  const { data } = await admin
    .from("whatsapp_connections")
    .select(
      "id, business_id, meta_phone_number_id, meta_access_token, meta_access_token_secret_key_name",
    )
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    setCached(whatsappCache, businessId, null);
    return null;
  }

  const accessToken = await resolveIntegrationSecret(admin, {
    businessId,
    kind: "WHATSAPP_META_ACCESS_TOKEN",
    secretKeyName: data.meta_access_token_secret_key_name,
    legacyValue: data.meta_access_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("whatsapp_connections")
        .update({
          meta_access_token: null,
          meta_access_token_secret_key_name: secretKeyName,
        })
        .eq("id", data.id);
    },
  });
  const connection = {
    meta_phone_number_id: data.meta_phone_number_id,
    meta_access_token: accessToken,
  };

  setCached(whatsappCache, businessId, connection);
  return connection;
}

export async function getCachedTelegramDeliveryConnection(
  admin: MessagingDbClient,
  businessId: string,
): Promise<TelegramDeliveryConnection | null> {
  const cached = getCached(telegramCache, businessId);

  if (cached !== undefined) {
    return cached;
  }

  const { data } = await admin
    .from("telegram_connections")
    .select("id, business_id, bot_token, bot_token_secret_key_name")
    .eq("business_id", businessId)
    .eq("telegram_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    setCached(telegramCache, businessId, null);
    return null;
  }

  const botToken = await resolveIntegrationSecret(admin, {
    businessId,
    kind: "TELEGRAM_BOT_TOKEN",
    secretKeyName: data.bot_token_secret_key_name,
    legacyValue: data.bot_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("telegram_connections")
        .update({
          bot_token: null,
          bot_token_secret_key_name: secretKeyName,
        })
        .eq("id", data.id);
    },
  });
  const connection = { bot_token: botToken };

  setCached(telegramCache, businessId, connection);
  return connection;
}
