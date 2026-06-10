import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AgentAnalyticsRollupItem,
  AutomationOpsMetrics,
} from "@/types/analytics.types";

const EMPTY_AUTOMATION_OPS: AutomationOpsMetrics = {
  runsToday: 0,
  runsLast30Days: 0,
  successRatePercent: 0,
  failedRunsLast30Days: 0,
  topTriggers: [],
};

function startOfDaysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

export async function listAgentsAnalyticsRollup(
  businessId: string,
): Promise<AgentAnalyticsRollupItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data: agents } = await admin
    .from("ai_agents")
    .select("id, name, enabled")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!agents?.length) {
    return [];
  }

  const agentIds = agents.map((agent) => agent.id);
  const sevenDaysAgo = startOfDaysAgo(7);

  const { data: messages } = await admin
    .from("messages")
    .select("ai_agent_id, created_at, conversation_id")
    .in("ai_agent_id", agentIds);

  const conversationIds = [
    ...new Set((messages ?? []).map((row) => row.conversation_id)),
  ];

  const contactByConversation = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: conversations } = await admin
      .from("conversations")
      .select("id, contact_id")
      .eq("business_id", businessId)
      .in("id", conversationIds);

    for (const conversation of conversations ?? []) {
      if (conversation.contact_id) {
        contactByConversation.set(conversation.id, conversation.contact_id);
      }
    }
  }

  const stats = new Map<
    string,
    {
      totalAiReplies: number;
      aiRepliesLast7Days: number;
      contactIds: Set<string>;
    }
  >();

  for (const agent of agents) {
    stats.set(agent.id, {
      totalAiReplies: 0,
      aiRepliesLast7Days: 0,
      contactIds: new Set(),
    });
  }

  for (const message of messages ?? []) {
    if (!message.ai_agent_id) {
      continue;
    }

    const entry = stats.get(message.ai_agent_id);

    if (!entry) {
      continue;
    }

    entry.totalAiReplies += 1;

    if (new Date(message.created_at) >= sevenDaysAgo) {
      entry.aiRepliesLast7Days += 1;
    }

    const contactId = contactByConversation.get(message.conversation_id);

    if (contactId) {
      entry.contactIds.add(contactId);
    }
  }

  return agents.map((agent) => {
    const entry = stats.get(agent.id)!;

    return {
      agentId: agent.id,
      agentName: agent.name,
      enabled: agent.enabled,
      contactsServed: entry.contactIds.size,
      totalAiReplies: entry.totalAiReplies,
      aiRepliesLast7Days: entry.aiRepliesLast7Days,
    };
  });
}

export async function getAutomationOpsMetrics(
  businessId: string,
): Promise<AutomationOpsMetrics> {
  if (!hasSupabaseEnv()) {
    return EMPTY_AUTOMATION_OPS;
  }

  const admin = createAdminClient();
  const todayStart = startOfDaysAgo(0);
  const thirtyDaysAgo = startOfDaysAgo(30);

  const { data: runs } = await admin
    .from("automation_runs")
    .select("trigger_type, status, created_at")
    .eq("business_id", businessId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  const rows = runs ?? [];
  let runsToday = 0;
  let successCount = 0;
  let failedCount = 0;
  const triggerCounts = new Map<string, number>();

  for (const row of rows) {
    const createdAt = new Date(row.created_at);

    if (createdAt >= todayStart) {
      runsToday += 1;
    }

    if (row.status === "success") {
      successCount += 1;
    } else if (row.status === "failed") {
      failedCount += 1;
    }

    if (row.status === "success") {
      triggerCounts.set(
        row.trigger_type,
        (triggerCounts.get(row.trigger_type) ?? 0) + 1,
      );
    }
  }

  const measured = successCount + failedCount;
  const successRatePercent =
    measured > 0 ? Math.round((successCount / measured) * 100) : 0;

  const topTriggers = [...triggerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([triggerType, count]) => ({ triggerType, count }));

  return {
    runsToday,
    runsLast30Days: rows.length,
    successRatePercent,
    failedRunsLast30Days: failedCount,
    topTriggers,
  };
}
