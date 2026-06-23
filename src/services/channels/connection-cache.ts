import "server-only";

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
    .select("meta_phone_number_id, meta_access_token")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  setCached(whatsappCache, businessId, data ?? null);
  return data ?? null;
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
    .select("bot_token")
    .eq("business_id", businessId)
    .eq("telegram_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  setCached(telegramCache, businessId, data ?? null);
  return data ?? null;
}
