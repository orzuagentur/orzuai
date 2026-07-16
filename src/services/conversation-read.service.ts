import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { countUnreadCalendarNotifications } from "@/services/business-notifications.service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagingChannel } from "@/types/database.types";
import { sumUnreadByChannel } from "@/utils/conversation-unread";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

const OPEN_STATUSES = new Set(["open", "active", "pending"]);
const NEW_LEAD_PIPELINE_STAGE = "new";

function isNewLeadPipelineStage(pipelineStage: string | null | undefined): boolean {
  return (pipelineStage ?? NEW_LEAD_PIPELINE_STAGE) === NEW_LEAD_PIPELINE_STAGE;
}

function trackUnreadContactForCrm(
  unreadContactIds: Set<string>,
  contactId: string | null | undefined,
  pipelineStage: string | null | undefined,
): void {
  if (!contactId || !isNewLeadPipelineStage(pipelineStage)) {
    return;
  }

  unreadContactIds.add(contactId);
}

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
    supabase
      .from("conversations")
      .update({ last_read_at: now })
      .eq("id", conversationId)
      .eq("business_id", businessId),
  ]);
}

export type DashboardNavBadgeCounts = {
  inboxUnread: number;
  crmUnread: number;
  calendarAiUnread: number;
  overdueTasks: number;
  upcomingEvents: number;
  unreadByChannel: Record<MessagingChannel, number>;
};

async function countOverdueAndUpcoming(
  businessId: string,
): Promise<{ overdueTasks: number; upcomingEvents: number }> {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const upcomingUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const [
    { count: overdueCrm },
    { count: overdueCalendarTasks },
    { count: upcomingEvents },
  ] = await Promise.all([
    admin
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "open")
      .lt("due_at", nowIso)
      .not("due_at", "is", null),
    admin
      .from("calendar_tasks")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "open")
      .lt("due_at", nowIso),
    admin
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("start_at", nowIso)
      .lte("start_at", upcomingUntil),
  ]);

  return {
    overdueTasks: (overdueCrm ?? 0) + (overdueCalendarTasks ?? 0),
    upcomingEvents: upcomingEvents ?? 0,
  };
}

export async function getDashboardNavBadgeCounts(
  businessId: string,
  userId: string,
): Promise<DashboardNavBadgeCounts> {
  const empty: DashboardNavBadgeCounts = {
    inboxUnread: 0,
    crmUnread: 0,
    calendarAiUnread: 0,
    overdueTasks: 0,
    upcomingEvents: 0,
    unreadByChannel: createEmptyUnreadByChannel(),
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();
  const [{ data: userReadRows }, { data: fallbackRows }] = await Promise.all([
    supabase
      .from("conversation_reads")
      .select(
        "conversation_id, unread_count, conversation:conversations(channel, contact_id, status, contact:contacts(pipeline_stage))",
      )
      .eq("business_id", businessId)
      .eq("user_id", userId),
    supabase
      .from("conversations")
      .select(
        "id, unread_count, channel, contact_id, status, contact:contacts(pipeline_stage)",
      )
      .eq("business_id", businessId)
      .gt("unread_count", 0),
  ]);

  const userReadConversationIds = new Set(
    (userReadRows ?? []).map((row) => row.conversation_id),
  );
  const unreadContactIds = new Set<string>();

  for (const row of userReadRows ?? []) {
    const conversation = Array.isArray(row.conversation)
      ? row.conversation[0]
      : row.conversation;

    if (
      !conversation ||
      !OPEN_STATUSES.has(conversation.status) ||
      (row.unread_count ?? 0) <= 0
    ) {
      continue;
    }

    const contact = Array.isArray(conversation.contact)
      ? conversation.contact[0]
      : conversation.contact;

    trackUnreadContactForCrm(
      unreadContactIds,
      conversation.contact_id,
      contact?.pipeline_stage,
    );

    if (conversation.channel in empty.unreadByChannel) {
      empty.unreadByChannel[conversation.channel as MessagingChannel] +=
        row.unread_count ?? 0;
    }
  }

  for (const row of fallbackRows ?? []) {
    if (userReadConversationIds.has(row.id)) {
      continue;
    }

    if (!OPEN_STATUSES.has(row.status) || (row.unread_count ?? 0) <= 0) {
      continue;
    }

    const contact = Array.isArray(row.contact)
      ? row.contact[0]
      : row.contact;

    trackUnreadContactForCrm(
      unreadContactIds,
      row.contact_id,
      contact?.pipeline_stage,
    );

    if (row.channel in empty.unreadByChannel) {
      empty.unreadByChannel[row.channel as MessagingChannel] +=
        row.unread_count ?? 0;
    }
  }

  const admin = createAdminClient();
  const [calendarAiUnread, agenda] = await Promise.all([
    countUnreadCalendarNotifications(admin, businessId),
    countOverdueAndUpcoming(businessId),
  ]);

  return {
    inboxUnread: sumUnreadByChannel(empty.unreadByChannel),
    crmUnread: unreadContactIds.size,
    calendarAiUnread,
    overdueTasks: agenda.overdueTasks,
    upcomingEvents: agenda.upcomingEvents,
    unreadByChannel: empty.unreadByChannel,
  };
}
