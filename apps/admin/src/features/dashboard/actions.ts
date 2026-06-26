"use server";

import type {
  AiDailyActivity,
  AiExpensesOverview,
  AiProviderExpense,
  ChannelConnectionStat,
  PlatformDashboardMetrics,
  PlanRevenueStat,
} from "@/features/dashboard/types";
import { PLATFORM_PLANS, resolvePlanId, type PlatformPlanId } from "@/features/dashboard/plans";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const CHANNEL_CONNECTIONS: Array<{
  table: string;
  column: string;
  channel: string;
  label: string;
}> = [
  {
    table: "whatsapp_connections",
    column: "whatsapp_status",
    channel: "whatsapp",
    label: "WhatsApp",
  },
  {
    table: "instagram_connections",
    column: "instagram_status",
    channel: "instagram",
    label: "Instagram",
  },
  {
    table: "telegram_connections",
    column: "telegram_status",
    channel: "telegram",
    label: "Telegram",
  },
  {
    table: "email_connections",
    column: "email_status",
    channel: "email",
    label: "Email",
  },
  {
    table: "website_form_connections",
    column: "connection_status",
    channel: "website_forms",
    label: "Формы сайта",
  },
];

const AI_PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  claude: "Anthropic Claude",
};

function getMonthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function getThirtyDaysAgoIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

function sumRows<T extends Record<string, unknown>>(
  rows: T[],
  field: keyof T,
): number {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
}

function formatUsd(value: number): number {
  return Number(value.toFixed(4));
}

async function countTable(
  table: string,
  gte?: { column: string; value: string },
): Promise<number> {
  const service = createServiceRoleClient();
  let query = service.from(table).select("*", { count: "exact", head: true });

  if (gte) {
    query = query.gte(gte.column, gte.value);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

async function countConnectedChannels(): Promise<ChannelConnectionStat[]> {
  const service = createServiceRoleClient();

  const results = await Promise.all(
    CHANNEL_CONNECTIONS.map(async (entry) => {
      const { count, error } = await service
        .from(entry.table)
        .select("*", { count: "exact", head: true })
        .eq(entry.column, "connected");

      return {
        channel: entry.channel,
        label: entry.label,
        connected: error ? 0 : (count ?? 0),
      };
    }),
  );

  return results;
}

async function getSubscriptionStats(): Promise<{
  estimatedMrrUsd: number;
  byPlan: PlanRevenueStat[];
  activeSubscriptions: number;
  withStripe: number;
}> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("businesses")
    .select("subscription_plan, subscription_status, stripe_customer_id");

  if (error || !data) {
    return { estimatedMrrUsd: 0, byPlan: [], activeSubscriptions: 0, withStripe: 0 };
  }

  const planCounts = new Map<PlatformPlanId, number>();
  let activeSubscriptions = 0;
  let withStripe = 0;

  for (const row of data) {
    const planId = resolvePlanId(row.subscription_plan);
    planCounts.set(planId, (planCounts.get(planId) ?? 0) + 1);

    const status = row.subscription_status?.toLowerCase() ?? "";

    if (status === "active" || status === "trialing") {
      activeSubscriptions += 1;
    }

    if (row.stripe_customer_id) {
      withStripe += 1;
    }
  }

  const byPlan: PlanRevenueStat[] = Object.entries(PLATFORM_PLANS).map(
    ([plan, config]) => {
      const count = planCounts.get(plan as PlatformPlanId) ?? 0;

      return {
        plan,
        label: config.label,
        count,
        revenueUsd: count * config.priceMonthly,
      };
    },
  );

  const estimatedMrrUsd = byPlan.reduce(
    (sum, entry) => sum + entry.revenueUsd,
    0,
  );

  return { estimatedMrrUsd, byPlan, activeSubscriptions, withStripe };
}

async function safeCount(
  run: () => Promise<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const result = await run();
    return result.error ? 0 : (result.count ?? 0);
  } catch {
    return 0;
  }
}

async function safeSelect<T>(
  run: () => Promise<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const result = await run();
    return result.error ? fallback : (result.data ?? fallback);
  } catch {
    return fallback;
  }
}

export async function fetchDashboardMetricsAction(): Promise<PlatformDashboardMetrics> {
  await requirePlatformAdmin();

  const monthStart = getMonthStartIso();
  const service = createServiceRoleClient();

  const [
    usersTotal,
    usersNewThisMonth,
    businessesTotal,
    contactsTotal,
    contactsNewThisMonth,
    monthMessages,
    monthAiReplies,
    channelAnalytics,
    channelStats,
    subscriptionStats,
    aiLogs,
    aiMonthLogs,
    platformBillingCalls,
  ] = await Promise.all([
    countTable("users"),
    countTable("users", { column: "created_at", value: monthStart }),
    countTable("businesses"),
    countTable("contacts"),
    countTable("contacts", { column: "created_at", value: monthStart }),
    countTable("messages", { column: "created_at", value: monthStart }),
    safeCount(async () =>
      service
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("ai_generated", true)
        .gte("created_at", monthStart),
    ),
    safeSelect(
      async () =>
        service
          .from("channel_analytics")
          .select("total_messages, total_contacts, ai_replies, channel"),
      [],
    ),
    countConnectedChannels(),
    getSubscriptionStats(),
    safeSelect(
      async () =>
        service
          .from("ai_usage_logs")
          .select("estimated_cost_usd, billing_source"),
      [],
    ),
    safeSelect(
      async () =>
        service
          .from("ai_usage_logs")
          .select("estimated_cost_usd")
          .gte("created_at", monthStart),
      [],
    ),
    safeCount(async () =>
      service
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("billing_source", "platform"),
    ),
  ]);

  const totalMessages = sumRows(channelAnalytics, "total_messages");
  const aiReplies = sumRows(channelAnalytics, "ai_replies");

  return {
    users: {
      total: usersTotal,
      newThisMonth: usersNewThisMonth,
    },
    businesses: {
      total: businessesTotal,
      withStripe: subscriptionStats.withStripe,
      activeSubscriptions: subscriptionStats.activeSubscriptions,
    },
    channels: {
      totalConnected: channelStats.reduce(
        (sum, entry) => sum + entry.connected,
        0,
      ),
      byChannel: channelStats,
    },
    messaging: {
      totalMessages,
      aiReplies,
      monthMessages,
      monthAiReplies,
    },
    contacts: {
      total: contactsTotal,
      newThisMonth: contactsNewThisMonth,
    },
    subscriptions: {
      estimatedMrrUsd: subscriptionStats.estimatedMrrUsd,
      byPlan: subscriptionStats.byPlan,
    },
    ai: {
      totalCostUsd: formatUsd(sumRows(aiLogs, "estimated_cost_usd")),
      monthCostUsd: formatUsd(sumRows(aiMonthLogs, "estimated_cost_usd")),
      totalCalls: aiLogs.length,
      monthCalls: aiMonthLogs.length,
      platformBillingCalls,
    },
  };
}

export async function fetchAiExpensesAction(): Promise<AiExpensesOverview> {
  await requirePlatformAdmin();

  const monthStart = getMonthStartIso();
  const thirtyDaysAgo = getThirtyDaysAgoIso();
  const service = createServiceRoleClient();

  const { data: recentLogs, error } = await service
    .from("ai_usage_logs")
    .select(
      "provider, estimated_cost_usd, call_type, input_tokens, output_tokens, created_at",
    )
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const logs = recentLogs ?? [];
  const providerMap = new Map<string, AiProviderExpense>();

  for (const log of logs) {
    const provider = log.provider || "other";
    const current = providerMap.get(provider) ?? {
      provider,
      label: AI_PROVIDER_LABELS[provider] ?? provider,
      totalCostUsd: 0,
      monthCostUsd: 0,
      totalCalls: 0,
      monthCalls: 0,
      autoReplies: 0,
      monthAutoReplies: 0,
      inputTokens: 0,
      outputTokens: 0,
      lastActivityAt: null,
      dailyActivity: [],
    };

    const cost = Number(log.estimated_cost_usd ?? 0);
    const isMonth = log.created_at >= monthStart;
    const isAutoReply = log.call_type === "auto_reply";

    current.totalCalls += 1;
    current.totalCostUsd += cost;
    current.inputTokens += Number(log.input_tokens ?? 0);
    current.outputTokens += Number(log.output_tokens ?? 0);

    if (isAutoReply) {
      current.autoReplies += 1;
    }

    if (isMonth) {
      current.monthCalls += 1;
      current.monthCostUsd += cost;

      if (isAutoReply) {
        current.monthAutoReplies += 1;
      }
    }

    if (!current.lastActivityAt || log.created_at > current.lastActivityAt) {
      current.lastActivityAt = log.created_at;
    }

    providerMap.set(provider, current);
  }

  const dailyByProvider = new Map<string, Map<string, AiDailyActivity>>();

  for (const log of logs) {
    const provider = log.provider || "other";
    const date = log.created_at.slice(0, 10);
    const providerDaily =
      dailyByProvider.get(provider) ?? new Map<string, AiDailyActivity>();
    const current = providerDaily.get(date) ?? {
      date,
      calls: 0,
      costUsd: 0,
      replies: 0,
    };

    current.calls += 1;
    current.costUsd += Number(log.estimated_cost_usd ?? 0);

    if (log.call_type === "auto_reply") {
      current.replies += 1;
    }

    providerDaily.set(date, current);
    dailyByProvider.set(provider, providerDaily);
  }

  const providers = Array.from(providerMap.values())
    .map((provider) => ({
      ...provider,
      totalCostUsd: formatUsd(provider.totalCostUsd),
      monthCostUsd: formatUsd(provider.monthCostUsd),
      dailyActivity: Array.from(
        dailyByProvider.get(provider.provider)?.values() ?? [],
      ).sort((left, right) => left.date.localeCompare(right.date)),
    }))
    .sort((left, right) => right.monthCostUsd - left.monthCostUsd);

  const totals = providers.reduce(
    (acc, provider) => ({
      totalCostUsd: acc.totalCostUsd + provider.totalCostUsd,
      monthCostUsd: acc.monthCostUsd + provider.monthCostUsd,
      totalCalls: acc.totalCalls + provider.totalCalls,
      monthCalls: acc.monthCalls + provider.monthCalls,
      totalAutoReplies: acc.totalAutoReplies + provider.autoReplies,
      monthAutoReplies: acc.monthAutoReplies + provider.monthAutoReplies,
    }),
    {
      totalCostUsd: 0,
      monthCostUsd: 0,
      totalCalls: 0,
      monthCalls: 0,
      totalAutoReplies: 0,
      monthAutoReplies: 0,
    },
  );

  return {
    totals: {
      ...totals,
      totalCostUsd: formatUsd(totals.totalCostUsd),
      monthCostUsd: formatUsd(totals.monthCostUsd),
    },
    providers,
  };
}
