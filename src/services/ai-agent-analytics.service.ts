import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { AiAgentAnalytics } from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";

function startOfDaysAgo(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

function buildDailySeries(
  messageDates: string[],
  days = 14,
): AiAgentAnalytics["dailyReplies"] {
  const counts = new Map<string, number>();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    counts.set(toDateKey(date.toISOString()), 0);
  }

  for (const createdAt of messageDates) {
    const key = toDateKey(createdAt);

    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export async function getAiAgentAnalytics(
  agentId: string,
): Promise<AiAgentAnalytics | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return null;
  }

  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id, channels, created_at")
    .eq("id", agentId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!agent) {
    return null;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, channel, created_at, conversation_id")
    .eq("ai_agent_id", agentId)
    .order("created_at", { ascending: true });

  const rows = messages ?? [];
  const conversationIds = [...new Set(rows.map((row) => row.conversation_id))];

  let contactsServed = 0;
  let clientMessagesInHandledConversations = 0;
  let humanRepliesAfterAgent = 0;

  if (conversationIds.length > 0) {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, contact_id")
      .eq("business_id", business.id)
      .in("id", conversationIds);

    const contactIds = new Set(
      (conversations ?? [])
        .map((conversation) => conversation.contact_id)
        .filter((value): value is string => Boolean(value)),
    );
    contactsServed = contactIds.size;

    const { count: clientCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("sender_type", "client");

    clientMessagesInHandledConversations = clientCount ?? 0;

    const { count: humanCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("sender_type", "user");

    humanRepliesAfterAgent = humanCount ?? 0;
  }

  const sevenDaysAgo = new Date(startOfDaysAgo(7)).getTime();
  const thirtyDaysAgo = new Date(startOfDaysAgo(30)).getTime();

  let aiRepliesLast7Days = 0;
  let aiRepliesLast30Days = 0;
  const channelStats = new Map<
    MessagingChannel,
    { aiReplies: number; conversationIds: Set<string> }
  >();

  for (const channel of agent.channels ?? []) {
    channelStats.set(channel as MessagingChannel, {
      aiReplies: 0,
      conversationIds: new Set(),
    });
  }

  for (const row of rows) {
    const createdAt = new Date(row.created_at).getTime();

    if (createdAt >= sevenDaysAgo) {
      aiRepliesLast7Days += 1;
    }

    if (createdAt >= thirtyDaysAgo) {
      aiRepliesLast30Days += 1;
    }

    const channelEntry = channelStats.get(row.channel as MessagingChannel);

    if (channelEntry) {
      channelEntry.aiReplies += 1;
      channelEntry.conversationIds.add(row.conversation_id);
    }
  }

  const totalAiReplies = rows.length;
  const firstReplyAt = rows[0]?.created_at ?? null;
  const lastReplyAt = rows.at(-1)?.created_at ?? null;

  const { data: contactRows } =
    conversationIds.length > 0
      ? await supabase
          .from("conversations")
          .select("id, contact_id, channel")
          .eq("business_id", business.id)
          .in("id", conversationIds)
      : { data: [] as Array<{ id: string; contact_id: string | null; channel: MessagingChannel }> };

  const contactsByChannel = new Map<MessagingChannel, Set<string>>();

  for (const conversation of contactRows ?? []) {
    if (!conversation.contact_id) {
      continue;
    }

    const existing =
      contactsByChannel.get(conversation.channel) ?? new Set<string>();
    existing.add(conversation.contact_id);
    contactsByChannel.set(conversation.channel, existing);
  }

  const channelBreakdown = (agent.channels ?? []).map((channel) => {
    const stats = channelStats.get(channel as MessagingChannel);
    const contactSet = contactsByChannel.get(channel as MessagingChannel);

    return {
      channel: channel as MessagingChannel,
      contactsServed: contactSet?.size ?? 0,
      aiReplies: stats?.aiReplies ?? 0,
      conversationsHandled: stats?.conversationIds.size ?? 0,
    };
  });

  return {
    agentId,
    contactsServed,
    conversationsHandled: conversationIds.length,
    totalAiReplies,
    aiRepliesLast7Days,
    aiRepliesLast30Days,
    clientMessagesInHandledConversations,
    humanRepliesAfterAgent,
    avgRepliesPerContact:
      contactsServed > 0
        ? Math.round((totalAiReplies / contactsServed) * 10) / 10
        : 0,
    avgRepliesPerConversation:
      conversationIds.length > 0
        ? Math.round((totalAiReplies / conversationIds.length) * 10) / 10
        : 0,
    lastReplyAt,
    firstReplyAt,
    trackingSince: firstReplyAt ?? agent.created_at,
    channelBreakdown,
    dailyReplies: buildDailySeries(rows.map((row) => row.created_at)),
  };
}
