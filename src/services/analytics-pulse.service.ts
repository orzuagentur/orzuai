import "server-only";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import {
  MESSAGING_INTEGRATION_CHANNELS,
  buildIntegrationActivateHref,
} from "@/features/integrations";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalyticsAttentionItem,
  AnalyticsPulseData,
  PulseKpi,
} from "@/types/analytics.types";
import type {
  CrmFunnelMetrics,
  SentimentBreakdown,
  TeamAnalyticsMetrics,
} from "@/types/dashboard.types";
import type { AnalyticsPeriod } from "@/utils/analytics-url";
import { buildPeriodActivity } from "@/utils/dashboard";

const STALE_NEW_CONTACT_DAYS = 7;

type PeriodBounds = {
  start: Date | null;
  prevStart: Date | null;
  prevEnd: Date | null;
};

function getPeriodBounds(period: AnalyticsPeriod): PeriodBounds {
  if (period === "all") {
    return { start: null, prevStart: null, prevEnd: null };
  }

  const days = period === "7d" ? 7 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setHours(0, 0, 0, 0);
  prevStart.setDate(prevStart.getDate() - (days - 1));

  return { start, prevStart, prevEnd };
}

function activityDaysForPeriod(period: AnalyticsPeriod): number {
  if (period === "30d") {
    return 30;
  }

  if (period === "all") {
    return 30;
  }

  return 7;
}

function calcDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function calcDelta(current: number, previous: number, hasComparison: boolean) {
  if (!hasComparison) {
    return null;
  }

  return calcDeltaPercent(current, previous);
}

function formatMinutes(value: number | null): string {
  if (value == null) {
    return "—";
  }

  if (value < 60) {
    return `${value}m`;
  }

  const hours = Math.round((value / 60) * 10) / 10;
  return `${hours}h`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

async function countContactsInRange(
  businessId: string,
  rangeStart: Date | null,
  rangeEnd: Date | null,
  pipelineStage?: string,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (pipelineStage) {
    query = query.eq("pipeline_stage", pipelineStage);
  }

  if (rangeStart) {
    query = query.gte("created_at", rangeStart.toISOString());
  }

  if (rangeEnd) {
    query = query.lte("created_at", rangeEnd.toISOString());
  }

  const { count } = await query;
  return count ?? 0;
}

async function sumWonRevenueInRange(
  businessId: string,
  rangeStart: Date | null,
  rangeEnd: Date | null,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("deal_value")
    .eq("business_id", businessId)
    .eq("pipeline_stage", "won");

  if (rangeStart) {
    query = query.gte("created_at", rangeStart.toISOString());
  }

  if (rangeEnd) {
    query = query.lte("created_at", rangeEnd.toISOString());
  }

  const { data } = await query;

  return (data ?? []).reduce((sum, row) => {
    const value = typeof row.deal_value === "number" ? row.deal_value : 0;
    return sum + value;
  }, 0);
}

async function getAiReplyShareInRange(
  businessId: string,
  rangeStart: Date | null,
  rangeEnd: Date | null,
): Promise<number> {
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId);

  const conversationIds = conversations?.map((row) => row.id) ?? [];

  if (conversationIds.length === 0) {
    return 0;
  }

  let query = supabase
    .from("messages")
    .select("sender_type, ai_generated")
    .in("conversation_id", conversationIds);

  if (rangeStart) {
    query = query.gte("created_at", rangeStart.toISOString());
  }

  if (rangeEnd) {
    query = query.lte("created_at", rangeEnd.toISOString());
  }

  const { data: messages } = await query;

  let aiReplies = 0;
  let outboundTotal = 0;

  for (const message of messages ?? []) {
    if (message.sender_type === "client") {
      continue;
    }

    outboundTotal += 1;

    if (message.ai_generated || message.sender_type === "ai") {
      aiReplies += 1;
    }
  }

  return outboundTotal > 0 ? Math.round((aiReplies / outboundTotal) * 100) : 0;
}

async function getAvgFirstResponseInRange(
  businessId: string,
  rangeStart: Date | null,
): Promise<number | null> {
  const supabase = await createClient();

  let conversationQuery = supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (rangeStart) {
    conversationQuery = conversationQuery.gte(
      "updated_at",
      rangeStart.toISOString(),
    );
  }

  const { data: conversations } = await conversationQuery;

  if (!conversations?.length) {
    return null;
  }

  const firstResponseMinutes: number[] = [];

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

    if (!firstReply) {
      continue;
    }

    const minutes = Math.round(
      (new Date(firstReply.created_at).getTime() - firstClientAt) / 60000,
    );
    firstResponseMinutes.push(minutes);
  }

  if (firstResponseMinutes.length === 0) {
    return null;
  }

  return Math.round(
    firstResponseMinutes.reduce((sum, value) => sum + value, 0) /
      firstResponseMinutes.length,
  );
}

async function getActivityTimestamps(
  businessId: string,
  days: number,
): Promise<string[]> {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId);

  const conversationIds = conversations?.map((row) => row.id) ?? [];

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("created_at")
    .in("conversation_id", conversationIds)
    .gte("created_at", start.toISOString());

  return messages?.map((message) => message.created_at) ?? [];
}

export async function getAnalyticsPulseData(
  businessId: string,
  period: AnalyticsPeriod,
): Promise<AnalyticsPulseData> {
  if (!hasSupabaseEnv()) {
    return {
      kpis: [],
      activity: buildPeriodActivity([], activityDaysForPeriod(period)),
      activityDays: activityDaysForPeriod(period),
      attention: [],
    };
  }

  const bounds = getPeriodBounds(period);
  const hasComparison = period !== "all";
  const rangeEnd = hasComparison ? null : null;

  const [
    newContacts,
    prevNewContacts,
    aiShare,
    prevAiShare,
    avgFirstResponse,
    prevAvgFirstResponse,
    qualified,
    prevQualified,
    wonRevenue,
    prevWonRevenue,
  ] = await Promise.all([
    countContactsInRange(businessId, bounds.start, rangeEnd),
    hasComparison
      ? countContactsInRange(
          businessId,
          bounds.prevStart,
          bounds.prevEnd,
        )
      : Promise.resolve(0),
    getAiReplyShareInRange(businessId, bounds.start, rangeEnd),
    hasComparison
      ? getAiReplyShareInRange(businessId, bounds.prevStart, bounds.prevEnd)
      : Promise.resolve(0),
    getAvgFirstResponseInRange(businessId, bounds.start),
    hasComparison
      ? getAvgFirstResponseInRange(businessId, bounds.prevStart)
      : Promise.resolve(null),
    period === "all"
      ? countContactsInRange(businessId, null, null, "qualified")
      : countContactsInRange(businessId, bounds.start, rangeEnd, "qualified"),
    hasComparison
      ? countContactsInRange(
          businessId,
          bounds.prevStart,
          bounds.prevEnd,
          "qualified",
        )
      : Promise.resolve(0),
    sumWonRevenueInRange(businessId, bounds.start, rangeEnd),
    hasComparison
      ? sumWonRevenueInRange(businessId, bounds.prevStart, bounds.prevEnd)
      : Promise.resolve(0),
  ]);

  const activityDays = activityDaysForPeriod(period);
  const timestamps = await getActivityTimestamps(businessId, activityDays);

  const kpis: PulseKpi[] = [
    {
      id: "new_contacts",
      label: ANALYTICS_MESSAGES.pulseNewContacts,
      value: String(newContacts),
      deltaPercent: calcDelta(newContacts, prevNewContacts, hasComparison),
    },
    {
      id: "ai_reply_share",
      label: ANALYTICS_MESSAGES.pulseAiReplyShare,
      value: `${aiShare}%`,
      deltaPercent: calcDelta(aiShare, prevAiShare, hasComparison),
    },
    {
      id: "avg_first_response",
      label: ANALYTICS_MESSAGES.pulseAvgFirstResponse,
      value: formatMinutes(avgFirstResponse),
      deltaPercent:
        avgFirstResponse != null && prevAvgFirstResponse != null && hasComparison
          ? calcDelta(avgFirstResponse, prevAvgFirstResponse, true)
          : null,
    },
    {
      id: "qualified",
      label: ANALYTICS_MESSAGES.pulseQualified,
      value: String(qualified),
      deltaPercent: calcDelta(qualified, prevQualified, hasComparison),
    },
    {
      id: "won_revenue",
      label: ANALYTICS_MESSAGES.pulseWonRevenue,
      value: formatCurrency(wonRevenue),
      deltaPercent: calcDelta(wonRevenue, prevWonRevenue, hasComparison),
    },
  ];

  return {
    kpis,
    activity: buildPeriodActivity(timestamps, activityDays),
    activityDays,
    attention: [],
  };
}

export async function buildAnalyticsAttentionFeed(input: {
  businessId: string;
  channelStatuses: IntegrationChannelStatusMap;
  teamAnalytics: TeamAnalyticsMetrics;
  sentiment: SentimentBreakdown;
  crmFunnel: CrmFunnelMetrics;
}): Promise<AnalyticsAttentionItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const items: AnalyticsAttentionItem[] = [];
  const supabase = await createClient();

  if (
    input.teamAnalytics.sampledConversations > 0 &&
    input.teamAnalytics.slaCompliancePercent < 60
  ) {
    items.push({
      id: "sla_low",
      severity: "warning",
      title: ANALYTICS_MESSAGES.attentionSlaTitle(
        input.teamAnalytics.slaCompliancePercent,
      ),
      description: ANALYTICS_MESSAGES.attentionSlaDescription(
        input.teamAnalytics.slaTargetMinutes,
      ),
      href: DASHBOARD_ROUTES.chats,
      actionLabel: ANALYTICS_MESSAGES.attentionOpenInbox,
    });
  }

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_NEW_CONTACT_DAYS);

  const { count: staleNewCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", input.businessId)
    .eq("pipeline_stage", "new")
    .lt("created_at", staleCutoff.toISOString());

  if ((staleNewCount ?? 0) > 0) {
    items.push({
      id: "stale_new_contacts",
      severity: "warning",
      title: ANALYTICS_MESSAGES.attentionStaleNewTitle(staleNewCount ?? 0),
      description: ANALYTICS_MESSAGES.attentionStaleNewDescription,
      href: DASHBOARD_ROUTES.contacts,
      actionLabel: ANALYTICS_MESSAGES.attentionViewCrm,
    });
  }

  const disconnectedChannels = MESSAGING_INTEGRATION_CHANNELS.filter(
    (channel) =>
      (input.channelStatuses[channel]?.status ?? "disconnected") ===
      "disconnected",
  );

  if (disconnectedChannels.length === 1) {
    const channel = disconnectedChannels[0]!;
    items.push({
      id: `channel_disconnected:${channel}`,
      severity: "info",
      title: ANALYTICS_MESSAGES.attentionChannelDisconnected(
        getChannelLabel(channel),
      ),
      href: buildIntegrationActivateHref(channel),
      actionLabel: ANALYTICS_MESSAGES.attentionConnectChannel,
    });
  } else if (disconnectedChannels.length > 1) {
    items.push({
      id: "channels_disconnected",
      severity: "info",
      title: `${disconnectedChannels.length} channels are not connected`,
      description: disconnectedChannels
        .map((channel) => getChannelLabel(channel))
        .join(", "),
      href: DASHBOARD_ROUTES.integrations,
      actionLabel: ANALYTICS_MESSAGES.attentionConnectChannel,
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: automationRunsToday } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", input.businessId)
    .eq("status", "success")
    .gte("created_at", todayStart.toISOString());

  if ((automationRunsToday ?? 0) > 0) {
    items.push({
      id: "automations_ran_today",
      severity: "info",
      title: ANALYTICS_MESSAGES.attentionAutomationsTitle(
        automationRunsToday ?? 0,
      ),
      href: `${DASHBOARD_ROUTES.automations}?tab=activity`,
      actionLabel: ANALYTICS_MESSAGES.attentionViewAutomations,
    });
  }

  const analyzedTotal =
    input.sentiment.positive +
    input.sentiment.neutral +
    input.sentiment.negative;

  if (analyzedTotal > 0) {
    const negativeShare = Math.round(
      (input.sentiment.negative / analyzedTotal) * 100,
    );

    if (negativeShare >= 25) {
      items.push({
        id: "negative_sentiment",
        severity: "critical",
        title: ANALYTICS_MESSAGES.attentionNegativeSentimentTitle(negativeShare),
        description: ANALYTICS_MESSAGES.attentionNegativeSentimentDescription,
        href: DASHBOARD_ROUTES.contacts,
        actionLabel: ANALYTICS_MESSAGES.attentionViewCrm,
      });
    }
  }

  const newStageCount =
    input.crmFunnel.stages.find((stage) => stage.stage === "new")?.count ?? 0;

  if (newStageCount === 0 && analyzedTotal === 0) {
    items.push({
      id: "getting_started",
      severity: "info",
      title: ANALYTICS_MESSAGES.attentionGettingStartedTitle,
      description: ANALYTICS_MESSAGES.attentionGettingStartedDescription,
      href: DASHBOARD_ROUTES.integrations,
      actionLabel: ANALYTICS_MESSAGES.attentionConnectChannel,
    });
  }

  return items.slice(0, 6);
}
