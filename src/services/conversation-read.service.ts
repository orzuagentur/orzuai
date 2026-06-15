import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { MessagingChannel } from "@/types/database.types";
import { countChannelsWithUnread } from "@/utils/conversation-unread";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

const OPEN_STATUSES = new Set(["open", "active", "pending"]);

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

  await supabase.from("conversation_reads").upsert(
    {
      business_id: businessId,
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: now,
      unread_count: 0,
    },
    { onConflict: "conversation_id,user_id" },
  );
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
  const [{ data: readRows }, { data: fallbackRows }] = await Promise.all([
    supabase
      .from("conversation_reads")
      .select(
        "conversation_id, unread_count, conversation:conversations(channel, contact_id, status)",
      )
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .gt("unread_count", 0),
    supabase
      .from("conversations")
      .select("id, unread_count, channel, contact_id, status")
      .eq("business_id", businessId)
      .gt("unread_count", 0),
  ]);

  const seenConversationIds = new Set<string>();
  const unreadContactIds = new Set<string>();

  for (const row of readRows ?? []) {
    const conversation = Array.isArray(row.conversation)
      ? row.conversation[0]
      : row.conversation;

    seenConversationIds.add(row.conversation_id);

    if (
      !conversation ||
      !OPEN_STATUSES.has(conversation.status) ||
      (row.unread_count ?? 0) <= 0
    ) {
      continue;
    }

    if (conversation.contact_id) {
      unreadContactIds.add(conversation.contact_id);
    }

    if (conversation.channel in empty.unreadByChannel) {
      empty.unreadByChannel[conversation.channel as MessagingChannel] +=
        row.unread_count ?? 0;
    }
  }

  for (const row of fallbackRows ?? []) {
    if (seenConversationIds.has(row.id)) {
      continue;
    }

    if (!OPEN_STATUSES.has(row.status) || (row.unread_count ?? 0) <= 0) {
      continue;
    }

    if (row.contact_id) {
      unreadContactIds.add(row.contact_id);
    }

    if (row.channel in empty.unreadByChannel) {
      empty.unreadByChannel[row.channel as MessagingChannel] +=
        row.unread_count ?? 0;
    }
  }

  return {
    inboxUnread: countChannelsWithUnread(empty.unreadByChannel),
    crmUnread: unreadContactIds.size,
    unreadByChannel: empty.unreadByChannel,
  };
}
