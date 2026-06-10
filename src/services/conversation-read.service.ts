import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { MessagingChannel } from "@/types/database.types";
import {
  buildUnreadClientMessageCountMap,
} from "@/utils/chat";
import { countChannelsWithUnread } from "@/utils/conversation-unread";

export async function markConversationRead(
  businessId: string,
  conversationId: string,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("conversations")
    .update({ last_read_at: now })
    .eq("id", conversationId)
    .eq("business_id", businessId);
}

export type DashboardNavBadgeCounts = {
  inboxUnread: number;
  crmUnread: number;
  unreadByChannel: Record<MessagingChannel, number>;
};

export async function getDashboardNavBadgeCounts(
  businessId: string,
): Promise<DashboardNavBadgeCounts> {
  const empty: DashboardNavBadgeCounts = {
    inboxUnread: 0,
    crmUnread: 0,
    unreadByChannel: {
      whatsapp: 0,
      telegram: 0,
      instagram: 0,
      website_forms: 0,
    },
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("conversations")
    .select("id, channel, status, last_read_at, contact_id")
    .eq("business_id", businessId)
    .in("status", ["open", "active", "pending"])
    .order("updated_at", { ascending: false })
    .limit(500);

  if (!rows?.length) {
    return empty;
  }

  const conversationIds = rows.map((row) => row.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, sender_type, ai_generated")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastReadAtByConversationId = new Map(
    rows.map((row) => [row.id, row.last_read_at]),
  );
  const unreadMessageCountByConversationId = buildUnreadClientMessageCountMap(
    messages ?? [],
    lastReadAtByConversationId,
  );
  const unreadContactIds = new Set<string>();

  for (const row of rows) {
    const unreadMessageCount =
      unreadMessageCountByConversationId.get(row.id) ?? 0;

    if (unreadMessageCount <= 0) {
      continue;
    }

    unreadContactIds.add(row.contact_id);

    if (row.channel in empty.unreadByChannel) {
      empty.unreadByChannel[row.channel as MessagingChannel] +=
        unreadMessageCount;
    }
  }

  return {
    inboxUnread: countChannelsWithUnread(empty.unreadByChannel),
    crmUnread: unreadContactIds.size,
    unreadByChannel: empty.unreadByChannel,
  };
}
