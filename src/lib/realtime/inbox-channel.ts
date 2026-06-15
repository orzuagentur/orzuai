import type { MessagingChannel } from "@/types/database.types";

export function getInboxRealtimeChannelName(
  businessId: string,
  channelFilter?: MessagingChannel,
): string {
  if (channelFilter) {
    return `inbox:${businessId}:${channelFilter}`;
  }

  return `inbox:${businessId}`;
}

/** Supabase realtime allows one column per filter; RLS scopes rows to the tenant. */
export function getInboxListPostgresFilter(
  businessId: string,
  channelFilter?: MessagingChannel,
): string {
  if (channelFilter) {
    return `channel=eq.${channelFilter}`;
  }

  return `business_id=eq.${businessId}`;
}
