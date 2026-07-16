import "server-only";

import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getChannelAnalytics,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import type {
  AnalyticsPageData,
  AnalyticsTotals,
} from "@/types/channel-workspace.types";
import { getAiCostMetrics } from "@/services/ai-usage.service";
import type { AiCostMetrics } from "@/types/ai-usage.types";
import type {
  ActivityDataPoint,
  AiPerformanceMetrics,
  ChannelMetricSummary,
  CrmFunnelMetrics,
  DashboardMetrics,
  DashboardOverview,
  LeadSourceEntry,
  RecentConversationItem,
  ResponseTimeMetrics,
  RevenueMetrics,
  SentimentBreakdown,
  TeamAnalyticsMetrics,
} from "@/types/dashboard.types";
import type { MessagingChannel as DbMessagingChannel } from "@/types/database.types";
import type { AgentDashboardStats } from "@/types/agent-dashboard.types";
import {
  getAgentRunsMetrics,
  getAutomationOpsMetrics,
  listRecentAgentRuns,
} from "@/services/analytics-ai-ops.service";
import { getAgentDashboardStats } from "@/services/agent-dashboard.service";
import {
  buildAnalyticsAttentionFeed,
  getAnalyticsPulseData,
} from "@/services/analytics-pulse.service";
import {
  buildLastSevenDaysActivity,
  calculateConversionRate,
} from "@/utils/dashboard";
import { parseAnalyticsSearchParams } from "@/utils/analytics-url";

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

const EMPTY_METRICS: DashboardMetrics = {
  totalMessages: 0,
  uniqueContacts: 0,
  aiResponses: 0,
  conversionRate: 0,
};

const EMPTY_RESPONSE_TIME: ResponseTimeMetrics = {
  avgFirstResponseMinutes: null,
  avgResolutionHours: null,
  sampledConversations: 0,
};

const EMPTY_CRM_FUNNEL: CrmFunnelMetrics = {
  stages: [],
  newToQualifiedRate: 0,
  qualifiedToWonRate: 0,
};

const EMPTY_AI_PERFORMANCE: AiPerformanceMetrics = {
  aiResolutionRate: 0,
  handoffRate: 0,
  estimatedMinutesSaved: 0,
  aiReplies: 0,
  humanReplies: 0,
  assistantOnlyReplies: 0,
  delegatedAgentReplies: 0,
  delegatedSharePercent: 0,
};

const EMPTY_AI_COST: AiCostMetrics = {
  totalCostUsd: 0,
  monthCostUsd: 0,
  totalReplies: 0,
  monthReplies: 0,
  avgCostPerReplyUsd: 0,
  byProvider: [],
};

const SLA_TARGET_MINUTES = 60;

const EMPTY_TEAM_ANALYTICS: TeamAnalyticsMetrics = {
  teamReplies: 0,
  aiReplies: 0,
  clientMessages: 0,
  slaCompliancePercent: 0,
  slaTargetMinutes: SLA_TARGET_MINUTES,
  sampledConversations: 0,
  avgHandoffAcceptMinutes: null,
};

const EMPTY_REVENUE: RevenueMetrics = {
  totalPipelineValue: 0,
  wonRevenue: 0,
  qualifiedPipelineValue: 0,
  openDealsCount: 0,
  avgDealSize: 0,
};

const EMPTY_AGENT_STATS: AgentDashboardStats = {
  aiTextReplies: 0,
  voiceAiReplies: 0,
  voiceAiReplyMinutes: 0,
  totalCallMinutes: 0,
  contactsServed: 0,
};

const EMPTY_SENTIMENT: SentimentBreakdown = {
  positive: 0,
  neutral: 0,
  negative: 0,
  unknown: 0,
};

function createEmptyOverview(): DashboardOverview {
  return {
    hasBusiness: false,
    metrics: EMPTY_METRICS,
    channelMetrics: [],
    activity: buildLastSevenDaysActivity([]),
    recentConversations: [],
    whatsappStatus: null,
    whatsappPhoneNumber: null,
    aiEnabled: null,
  };
}

async function buildChannelMetrics(
  businessId: string,
): Promise<ChannelMetricSummary[]> {
  const supabase = await createClient();
  const channelStatuses = await getChannelConnectionStatuses(businessId);

  const { data: rows } = await supabase
    .from("channel_analytics")
    .select("channel, total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId);

  const rowByChannel = new Map(
    (rows ?? []).map((row) => [row.channel as DbMessagingChannel, row]),
  );

  return MESSAGING_CHANNELS.flatMap((channel) => {
    const connectionStatus = channelStatuses[channel]?.status ?? "disconnected";

    if (connectionStatus !== "connected" && connectionStatus !== "pending") {
      return [];
    }

    const row = rowByChannel.get(channel);

    return [
      {
        channel,
        totalMessages: row?.total_messages ?? 0,
        totalContacts: row?.total_contacts ?? 0,
        aiReplies: row?.ai_replies ?? 0,
        status: connectionStatus,
      },
    ];
  });
}

export async function getAiPerformanceMetrics(
  businessId: string,
): Promise<AiPerformanceMetrics> {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId);

  const conversationIds = conversations?.map((row) => row.id) ?? [];

  if (conversationIds.length === 0) {
    return EMPTY_AI_PERFORMANCE;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("sender_type, ai_generated")
    .in("conversation_id", conversationIds);

  let aiReplies = 0;
  let humanReplies = 0;
  let assistantOnlyReplies = 0;
  const delegatedAgentReplies = 0;

  for (const message of messages ?? []) {
    if (message.sender_type === "client") {
      continue;
    }

    if (message.ai_generated || message.sender_type === "ai") {
      aiReplies += 1;

      assistantOnlyReplies += 1;
    } else if (message.sender_type === "user") {
      humanReplies += 1;
    }
  }

  const outboundTotal = aiReplies + humanReplies;
  const aiResolutionRate =
    outboundTotal > 0 ? Math.round((aiReplies / outboundTotal) * 100) : 0;
  const handoffRate =
    outboundTotal > 0 ? Math.round((humanReplies / outboundTotal) * 100) : 0;
  const delegatedSharePercent =
    aiReplies > 0
      ? Math.round((delegatedAgentReplies / aiReplies) * 100)
      : 0;

  return {
    aiResolutionRate,
    handoffRate,
    estimatedMinutesSaved: aiReplies * 2,
    aiReplies,
    humanReplies,
    assistantOnlyReplies,
    delegatedAgentReplies,
    delegatedSharePercent,
  };
}

export async function getLeadSourceAttribution(
  businessId: string,
): Promise<LeadSourceEntry[]> {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("channel")
    .eq("business_id", businessId);

  const counts = new Map<DbMessagingChannel, number>();

  for (const channel of MESSAGING_CHANNELS) {
    counts.set(channel, 0);
  }

  for (const contact of contacts ?? []) {
    const channel = contact.channel as DbMessagingChannel;
    counts.set(channel, (counts.get(channel) ?? 0) + 1);
  }

  const total = contacts?.length ?? 0;

  return MESSAGING_CHANNELS.map((channel) => {
    const contactCount = counts.get(channel) ?? 0;

    return {
      channel,
      contacts: contactCount,
      percentage: total > 0 ? Math.round((contactCount / total) * 100) : 0,
    };
  }).filter((entry) => entry.contacts > 0);
}

export async function getResponseTimeMetrics(
  businessId: string,
): Promise<ResponseTimeMetrics> {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, created_at, updated_at")
    .eq("business_id", businessId)
    .limit(100);

  if (!conversations?.length) {
    return EMPTY_RESPONSE_TIME;
  }

  const firstResponseMinutes: number[] = [];
  const resolutionHours: number[] = [];

  for (const conversation of conversations) {
    const { data: messages } = await supabase
      .from("messages")
      .select("sender_type, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (!messages?.length) {
      continue;
    }

    const firstClientIndex = messages.findIndex(
      (message) => message.sender_type === "client",
    );

    const firstClient = messages.at(firstClientIndex);

    if (!firstClient) {
      continue;
    }

    const firstClientAt = new Date(firstClient.created_at).getTime();
    const firstReply = messages
      .slice(firstClientIndex + 1)
      .find((message) => message.sender_type !== "client");

    if (firstReply) {
      const minutes =
        (new Date(firstReply.created_at).getTime() - firstClientAt) / 60000;
      firstResponseMinutes.push(minutes);
    }

    if (conversation.status === "resolved" || conversation.status === "closed") {
      const hours =
        (new Date(conversation.updated_at).getTime() -
          new Date(conversation.created_at).getTime()) /
        3600000;
      resolutionHours.push(hours);
    }
  }

  const avg = (values: number[]) =>
    values.length > 0
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;

  return {
    avgFirstResponseMinutes: avg(firstResponseMinutes),
    avgResolutionHours: avg(resolutionHours),
    sampledConversations: conversations.length,
  };
}

export async function getCrmFunnelMetrics(
  businessId: string,
): Promise<CrmFunnelMetrics> {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("pipeline_stage")
    .eq("business_id", businessId);

  const stageOrder = ["new", "qualified", "proposal", "won", "lost"] as const;
  const counts = new Map<string, number>();

  for (const stage of stageOrder) {
    counts.set(stage, 0);
  }

  for (const contact of contacts ?? []) {
    const stage = contact.pipeline_stage ?? "new";
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  const total = contacts?.length ?? 0;
  const stages = stageOrder.map((stage) => ({
    stage,
    count: counts.get(stage) ?? 0,
    percentage:
      total > 0
        ? Math.round(((counts.get(stage) ?? 0) / total) * 100)
        : 0,
  }));

  const newCount = counts.get("new") ?? 0;
  const qualifiedCount = counts.get("qualified") ?? 0;
  const wonCount = counts.get("won") ?? 0;

  return {
    stages,
    newToQualifiedRate:
      newCount > 0 ? Math.round((qualifiedCount / newCount) * 100) : 0,
    qualifiedToWonRate:
      qualifiedCount > 0 ? Math.round((wonCount / qualifiedCount) * 100) : 0,
  };
}

export async function getTeamAnalyticsMetrics(
  businessId: string,
): Promise<TeamAnalyticsMetrics> {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId);

  const conversationIds = conversations?.map((row) => row.id) ?? [];

  if (conversationIds.length === 0) {
    return EMPTY_TEAM_ANALYTICS;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("sender_type, ai_generated")
    .in("conversation_id", conversationIds);

  let teamReplies = 0;
  let aiReplies = 0;
  let clientMessages = 0;

  for (const message of messages ?? []) {
    if (message.sender_type === "client") {
      clientMessages += 1;
      continue;
    }

    if (message.ai_generated || message.sender_type === "ai") {
      aiReplies += 1;
    } else if (message.sender_type === "user") {
      teamReplies += 1;
    }
  }

  const { data: conversationRows } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .limit(50);

  let compliant = 0;
  let measured = 0;

  for (const conversation of conversationRows ?? []) {
    const { data: thread } = await supabase
      .from("messages")
      .select("sender_type, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (!thread?.length) {
      continue;
    }

    const firstClient = thread.find((row) => row.sender_type === "client");

    if (!firstClient) {
      continue;
    }

    const firstClientAt = new Date(firstClient.created_at).getTime();
    const firstReply = thread.find(
      (row) =>
        row.sender_type !== "client" &&
        new Date(row.created_at).getTime() > firstClientAt,
    );

    if (!firstReply) {
      continue;
    }

    measured += 1;
    const minutes =
      (new Date(firstReply.created_at).getTime() - firstClientAt) / 60000;

    if (minutes <= SLA_TARGET_MINUTES) {
      compliant += 1;
    }
  }

  const slaCompliancePercent =
    measured > 0 ? Math.round((compliant / measured) * 100) : 0;

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: handoffRows } = await supabase
    .from("ai_human_requests")
    .select("created_at, accepted_at")
    .eq("business_id", businessId)
    .eq("status", "accepted")
    .not("accepted_at", "is", null)
    .gte("accepted_at", thirtyDaysAgo);

  let handoffMinutesSum = 0;
  let handoffSamples = 0;

  for (const row of handoffRows ?? []) {
    if (!row.accepted_at) {
      continue;
    }

    const minutes =
      (new Date(row.accepted_at).getTime() -
        new Date(row.created_at).getTime()) /
      60000;

    if (Number.isFinite(minutes) && minutes >= 0) {
      handoffMinutesSum += minutes;
      handoffSamples += 1;
    }
  }

  const avgHandoffAcceptMinutes =
    handoffSamples > 0
      ? Math.round((handoffMinutesSum / handoffSamples) * 10) / 10
      : null;

  return {
    teamReplies,
    aiReplies,
    clientMessages,
    slaCompliancePercent,
    slaTargetMinutes: SLA_TARGET_MINUTES,
    sampledConversations: measured,
    avgHandoffAcceptMinutes,
  };
}

export async function getRevenueMetrics(
  businessId: string,
): Promise<RevenueMetrics> {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("pipeline_stage, deal_value")
    .eq("business_id", businessId);

  let totalPipelineValue = 0;
  let wonRevenue = 0;
  let qualifiedPipelineValue = 0;
  let openDealsCount = 0;
  let dealValuesSum = 0;
  let dealsWithValue = 0;

  for (const contact of contacts ?? []) {
    const value =
      typeof contact.deal_value === "number" ? contact.deal_value : 0;
    const stage = contact.pipeline_stage ?? "new";

    if (value > 0) {
      dealsWithValue += 1;
      dealValuesSum += value;
    }

    if (stage === "won") {
      wonRevenue += value;
      continue;
    }

    if (stage === "lost") {
      continue;
    }

    openDealsCount += value > 0 ? 1 : 0;
    totalPipelineValue += value;

    if (stage === "qualified" || stage === "proposal") {
      qualifiedPipelineValue += value;
    }
  }

  return {
    totalPipelineValue,
    wonRevenue,
    qualifiedPipelineValue,
    openDealsCount,
    avgDealSize:
      dealsWithValue > 0 ? Math.round(dealValuesSum / dealsWithValue) : 0,
  };
}

export async function getSentimentBreakdown(
  businessId: string,
): Promise<SentimentBreakdown> {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("sentiment")
    .eq("business_id", businessId);

  const breakdown: SentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
    unknown: 0,
  };

  for (const contact of contacts ?? []) {
    if (contact.sentiment === "positive") {
      breakdown.positive += 1;
    } else if (contact.sentiment === "neutral") {
      breakdown.neutral += 1;
    } else if (contact.sentiment === "negative") {
      breakdown.negative += 1;
    } else {
      breakdown.unknown += 1;
    }
  }

  return breakdown;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (!hasSupabaseEnv()) {
    return createEmptyOverview();
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return createEmptyOverview();
  }

  const supabase = await createClient();

  const [
    channelAnalyticsResult,
    channelMetrics,
    contactsCountResult,
    whatsappResult,
    aiSettingsResult,
    conversationsResult,
    allConversationsResult,
  ] = await Promise.all([
    supabase
      .from("channel_analytics")
      .select("total_messages, total_contacts, ai_replies")
      .eq("business_id", business.id),
    buildChannelMetrics(business.id),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("whatsapp_connections")
      .select("whatsapp_status, phone_number")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_settings")
      .select("ai_enabled, channel")
      .eq("business_id", business.id),
    supabase
      .from("conversations")
      .select(
        "id, status, updated_at, contact:contacts(name, phone_number)",
      )
      .eq("business_id", business.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase.from("conversations").select("id").eq("business_id", business.id),
  ]);

  const channelRows = channelAnalyticsResult.data ?? [];
  const totalMessages = channelRows.reduce(
    (sum, row) => sum + (row.total_messages ?? 0),
    0,
  );
  const uniqueContacts = contactsCountResult.count ?? 0;
  const aiResponses = channelRows.reduce(
    (sum, row) => sum + (row.ai_replies ?? 0),
    0,
  );

  const metrics: DashboardMetrics = {
    totalMessages,
    uniqueContacts,
    aiResponses,
    conversionRate: calculateConversionRate(aiResponses, totalMessages),
  };

  const conversationIds =
    allConversationsResult.data?.map((conversation) => conversation.id) ?? [];

  let activity: ActivityDataPoint[] = buildLastSevenDaysActivity([]);

  if (conversationIds.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: messages } = await supabase
      .from("messages")
      .select("created_at")
      .in("conversation_id", conversationIds)
      .gte("created_at", sevenDaysAgo.toISOString());

    activity = buildLastSevenDaysActivity(
      messages?.map((message) => message.created_at) ?? [],
    );
  }

  const recentConversations: RecentConversationItem[] =
    conversationsResult.data?.flatMap((conversation) => {
      const contact = Array.isArray(conversation.contact)
        ? conversation.contact[0]
        : conversation.contact;

      if (!contact) {
        return [];
      }

      return [
        {
          id: conversation.id,
          contactName: contact.name,
          contactPhone: contact.phone_number,
          status: conversation.status,
          updatedAt: conversation.updated_at,
        },
      ];
    }) ?? [];

  return {
    hasBusiness: true,
    metrics,
    channelMetrics,
    activity,
    recentConversations,
    whatsappStatus: whatsappResult.data?.whatsapp_status ?? null,
    whatsappPhoneNumber: whatsappResult.data?.phone_number ?? null,
    aiEnabled:
      aiSettingsResult.data && aiSettingsResult.data.length > 0
        ? aiSettingsResult.data.some((row) => row.ai_enabled)
        : null,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const overview = await getDashboardOverview();
  return overview.metrics;
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function buildTotals(
  channels: AnalyticsPageData["channels"],
): AnalyticsTotals {
  return channels.reduce<AnalyticsTotals>(
    (acc, entry) => ({
      totalMessages: acc.totalMessages + entry.analytics.totalMessages,
      totalContacts: acc.totalContacts + entry.analytics.totalContacts,
      aiReplies: acc.aiReplies + entry.analytics.aiReplies,
      activeConversations:
        acc.activeConversations + entry.analytics.activeConversations,
    }),
    {
      totalMessages: 0,
      totalContacts: 0,
      aiReplies: 0,
      activeConversations: 0,
    },
  );
}

const EMPTY_PULSE = {
  kpis: [],
  activity: buildLastSevenDaysActivity([]),
  activityDays: 7,
  attention: [],
};

const EMPTY_AUTOMATION_OPS = {
  runsToday: 0,
  runsLast30Days: 0,
  successRatePercent: 0,
  failedRunsLast30Days: 0,
  topTriggers: [],
};

const EMPTY_AGENT_RUNS = {
  runsToday: 0,
  runsLast30Days: 0,
  successRatePercent: 0,
  failedRunsLast30Days: 0,
  intentRoutesLast30Days: 0,
  keywordRoutesLast30Days: 0,
  assistantOnlyLast30Days: 0,
  actionsAppliedLast30Days: 0,
  blockedActionsLast30Days: 0,
  skippedDuplicatesLast30Days: 0,
  bookingFailuresLast30Days: 0,
};

export async function getAnalyticsPageData(input?: {
  tab?: string;
  period?: string;
  channel?: string;
}): Promise<AnalyticsPageData> {
  const { activeTab, activePeriod, activeChannelId } =
    parseAnalyticsSearchParams(input ?? {});

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      activeTab,
      activePeriod,
      pulse: EMPTY_PULSE,
      activeChannelId,
      channelStatuses: {},
      channels: [],
      totals: {
        totalMessages: 0,
        totalContacts: 0,
        aiReplies: 0,
        activeConversations: 0,
      },
      aiPerformance: EMPTY_AI_PERFORMANCE,
      leadSources: [],
      responseTime: EMPTY_RESPONSE_TIME,
      crmFunnel: EMPTY_CRM_FUNNEL,
      aiCost: EMPTY_AI_COST,
      teamAnalytics: EMPTY_TEAM_ANALYTICS,
      revenue: EMPTY_REVENUE,
      sentiment: EMPTY_SENTIMENT,
      agentStats: EMPTY_AGENT_STATS,
      automationOps: EMPTY_AUTOMATION_OPS,
      agentRuns: EMPTY_AGENT_RUNS,
      recentAgentRuns: [],
    };
  }

  const needsOverview = activeTab === "pulse";
  const needsChannels = activeTab === "channels";
  const needsCrm = activeTab === "sales";
  const needsAi = activeTab === "ai_ops";

  const channelStatuses = await getChannelConnectionStatuses(businessId);

  const [
    pulseBase,
    teamAnalytics,
    sentiment,
    crmFunnel,
    leadSources,
    revenue,
    aiPerformance,
    responseTime,
    aiCost,
    automationOps,
    agentRuns,
    recentAgentRuns,
    agentStats,
  ] = await Promise.all([
    needsOverview
      ? getAnalyticsPulseData(businessId, activePeriod)
      : Promise.resolve(EMPTY_PULSE),
    needsOverview || needsAi
      ? getTeamAnalyticsMetrics(businessId)
      : Promise.resolve(EMPTY_TEAM_ANALYTICS),
    needsOverview || needsCrm
      ? getSentimentBreakdown(businessId)
      : Promise.resolve(EMPTY_SENTIMENT),
    needsOverview || needsCrm
      ? getCrmFunnelMetrics(businessId)
      : Promise.resolve(EMPTY_CRM_FUNNEL),
    needsCrm
      ? getLeadSourceAttribution(businessId)
      : Promise.resolve([] as LeadSourceEntry[]),
    needsCrm
      ? getRevenueMetrics(businessId)
      : Promise.resolve(EMPTY_REVENUE),
    needsAi
      ? getAiPerformanceMetrics(businessId)
      : Promise.resolve(EMPTY_AI_PERFORMANCE),
    needsAi
      ? getResponseTimeMetrics(businessId)
      : Promise.resolve(EMPTY_RESPONSE_TIME),
    needsAi
      ? getAiCostMetrics(businessId)
      : Promise.resolve(EMPTY_AI_COST),
    needsAi
      ? getAutomationOpsMetrics(businessId)
      : Promise.resolve(EMPTY_AUTOMATION_OPS),
    needsAi
      ? getAgentRunsMetrics(businessId)
      : Promise.resolve(EMPTY_AGENT_RUNS),
    needsAi
      ? listRecentAgentRuns(businessId)
      : Promise.resolve([]),
    needsAi
      ? getAgentDashboardStats(businessId)
      : Promise.resolve(EMPTY_AGENT_STATS),
  ]);

  const attention =
    needsOverview
      ? await buildAnalyticsAttentionFeed({
          businessId,
          channelStatuses,
          teamAnalytics,
          sentiment,
          crmFunnel,
        })
      : [];

  const channels = needsChannels
      ? await Promise.all(
          MESSAGING_CHANNELS.map(async (channel) => {
            const isChannelConnected = isChannelConnectedForWorkspace(
              channel,
              channelStatuses,
            );
            const analytics = await getChannelAnalytics(channel);

            return {
              channel,
              analytics,
              isChannelConnected,
            };
          }),
        )
      : [];

  return {
    hasBusiness: true,
    activeTab,
    activePeriod,
    pulse: { ...pulseBase, attention },
    activeChannelId,
    channelStatuses,
    channels,
    totals: buildTotals(channels),
    aiPerformance,
    leadSources,
    responseTime,
    crmFunnel,
    aiCost,
    teamAnalytics,
    revenue,
    sentiment,
    agentStats,
    automationOps,
    agentRuns,
    recentAgentRuns,
  };
}
