import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { MessagingChannel } from "@/types/database.types";
import { countChannelsWithUnread } from "@/utils/conversation-unread";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

export async function markConversationRead(
  businessId: string,
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  await Promise.all([
    supabase
      .from("conversations")
      .update({ last_read_at: now, unread_count: 0 })
      .eq("id", conversationId)
      .eq("business_id", businessId),
    supabase.from("conversation_reads").upsert(
      {
        business_id: businessId,
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: now,
        unread_count: 0,
      },
      { onConflict: "conversation_id,user_id" },
    ),
  ]);
}

export type DashboardNavBadgeCounts = {
  inboxUnread: number;
  crmUnread: number;
  unreadByChannel: Record<MessagingChannel, number>;
};

export async function getDashboardNavBadgeCounts(
  businessId: string,
  userId: string,
): Promise<DashboardNavBadgeCounts> {
  const empty: DashboardNavBadgeCounts = {
    inboxUnread: 0,
    crmUnread: 0,
    unreadByChannel: createEmptyUnreadByChannel(),
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("conversation_reads")
    .select("conversation_id, unread_count, conversation:conversations(channel, contact_id, status)")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .gt("unread_count", 0);

  if (!rows?.length) {
    return empty;
  }

  const unreadContactIds = new Set<string>();

  for (const row of rows) {
    const conversation = Array.isArray(row.conversation)
      ? row.conversation[0]
      : row.conversation;

    if (
      !conversation ||
      !["open", "active", "pending"].includes(conversation.status)
    ) {
      continue;
    }

    const unreadMessageCount = row.unread_count ?? 0;

    if (unreadMessageCount <= 0) {
      continue;
    }

    if (conversation.contact_id) {
      unreadContactIds.add(conversation.contact_id);
    }

    if (conversation.channel in empty.unreadByChannel) {
      empty.unreadByChannel[conversation.channel as MessagingChannel] +=
        unreadMessageCount;
    }
  }

  return {
    inboxUnread: countChannelsWithUnread(empty.unreadByChannel),
    crmUnread: unreadContactIds.size,
    unreadByChannel: empty.unreadByChannel,
  };
}
