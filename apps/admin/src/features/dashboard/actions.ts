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
import { getPeriodRange, resolveAnalyticsPeriod } from "@/features/dashboard/period";
import {
  getPlatformAiProviderLabel,
  PLATFORM_AI_PROVIDERS,
} from "@/features/dashboard/providers";
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

type AiProviderStatsRow = {
  provider: string;
  total_calls: number;
  auto_replies: number;
  voice_stt_calls: number;
  voice_tts_calls: number;
  voice_stt_cost_usd: number;
  voice_tts_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  last_activity_at: string | null;
};

type AiDailyActivityRow = {
  provider: string;
  activity_date: string;
  calls: number;
  cost_usd: number;
  replies: number;
};

type AiTotalsRow = {
  total_calls: number;
  auto_replies: number;
  voice_stt_calls: number;
  voice_tts_calls: number;
  voice_stt_cost_usd: number;
  voice_tts_cost_usd: number;
  cost_usd: number;
};

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

async function fetchAiProviderStats(input: {
  start: string | null;
  end: string;
}): Promise<AiProviderStatsRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("platform_admin_ai_provider_stats", {
    p_start: input.start,
    p_end: input.end,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AiProviderStatsRow[];
}

async function fetchAiDailyActivity(input: {
  start: string;
  end: string;
}): Promise<AiDailyActivityRow[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("platform_admin_ai_daily_activity", {
    p_start: input.start,
    p_end: input.end,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AiDailyActivityRow[];
}

async function fetchAiTotals(input: {
  start: string | null;
  end: string;
}): Promise<AiTotalsRow> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("platform_admin_ai_totals", {
    p_start: input.start,
    p_end: input.end,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    total_calls: Number(row?.total_calls ?? 0),
    auto_replies: Number(row?.auto_replies ?? 0),
    voice_stt_calls: Number(row?.voice_stt_calls ?? 0),
    voice_tts_calls: Number(row?.voice_tts_calls ?? 0),
    voice_stt_cost_usd: Number(row?.voice_stt_cost_usd ?? 0),
    voice_tts_cost_usd: Number(row?.voice_tts_cost_usd ?? 0),
    cost_usd: Number(row?.cost_usd ?? 0),
  };
}

function sumRows<T extends Record<string, unknown>>(
  rows: T[],
  field: keyof T,
): number {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
}

function getMonthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function fetchDashboardMetricsAction(): Promise<PlatformDashboardMetrics> {
  await requirePlatformAdmin();

  const monthStart = getMonthStartIso();
  const monthEnd = new Date().toISOString();
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
    aiAllTimeTotals,
    aiMonthTotals,
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
    fetchAiTotals({ start: null, end: monthEnd }),
    fetchAiTotals({ start: monthStart, end: monthEnd }),
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
      totalCostUsd: formatUsd(aiAllTimeTotals.cost_usd),
      monthCostUsd: formatUsd(aiMonthTotals.cost_usd),
      totalCalls: aiAllTimeTotals.total_calls,
      monthCalls: aiMonthTotals.total_calls,
      platformBillingCalls,
    },
  };
}

export async function fetchAiExpensesAction(
  periodInput?: string,
): Promise<AiExpensesOverview> {
  await requirePlatformAdmin();

  const period = resolveAnalyticsPeriod(periodInput);
  const range = getPeriodRange(period);
  const allTimeEnd = new Date().toISOString();

  const [periodStats, allTimeStats, dailyRows, periodTotalsRow] =
    await Promise.all([
    fetchAiProviderStats({ start: range.start, end: range.end }),
    fetchAiProviderStats({ start: null, end: allTimeEnd }),
    range.start
      ? fetchAiDailyActivity({ start: range.start, end: range.end })
      : Promise.resolve([] as AiDailyActivityRow[]),
    fetchAiTotals({ start: range.start, end: range.end }),
  ]);

  const periodByProvider = new Map(
    periodStats.map((row) => [row.provider, row]),
  );
  const allTimeByProvider = new Map(
    allTimeStats.map((row) => [row.provider, row]),
  );

  const dailyByProvider = new Map<string, AiDailyActivity[]>();

  for (const row of dailyRows) {
    const current = dailyByProvider.get(row.provider) ?? [];
    current.push({
      date: row.activity_date,
      calls: Number(row.calls),
      costUsd: formatUsd(Number(row.cost_usd)),
      replies: Number(row.replies),
    });
    dailyByProvider.set(row.provider, current);
  }

  const knownProviderIds = new Set<string>(
    PLATFORM_AI_PROVIDERS.map((provider) => provider.id),
  );

  for (const row of periodStats) {
    knownProviderIds.add(row.provider);
  }

  for (const row of allTimeStats) {
    knownProviderIds.add(row.provider);
  }

  function mapProviderExpense(
    providerId: string,
    label: string,
    description: string,
    periodRow?: AiProviderStatsRow,
    allTimeRow?: AiProviderStatsRow,
  ): AiProviderExpense {
    return {
      provider: providerId,
      label,
      description,
      periodCostUsd: formatUsd(Number(periodRow?.cost_usd ?? 0)),
      allTimeCostUsd: formatUsd(Number(allTimeRow?.cost_usd ?? 0)),
      periodCalls: Number(periodRow?.total_calls ?? 0),
      periodAutoReplies: Number(periodRow?.auto_replies ?? 0),
      periodVoiceSttCalls: Number(periodRow?.voice_stt_calls ?? 0),
      periodVoiceTtsCalls: Number(periodRow?.voice_tts_calls ?? 0),
      periodVoiceSttCostUsd: formatUsd(Number(periodRow?.voice_stt_cost_usd ?? 0)),
      periodVoiceTtsCostUsd: formatUsd(Number(periodRow?.voice_tts_cost_usd ?? 0)),
      inputTokens: Number(periodRow?.input_tokens ?? 0),
      outputTokens: Number(periodRow?.output_tokens ?? 0),
      lastActivityAt: allTimeRow?.last_activity_at ?? null,
      dailyActivity: dailyByProvider.get(providerId) ?? [],
      hasActivity: Number(allTimeRow?.total_calls ?? 0) > 0,
    };
  }

  const providers = PLATFORM_AI_PROVIDERS.map((config) =>
    mapProviderExpense(
      config.id,
      config.label,
      config.description,
      periodByProvider.get(config.id),
      allTimeByProvider.get(config.id),
    ),
  );

  const extraProviders = Array.from(knownProviderIds)
    .filter(
      (providerId) =>
        !PLATFORM_AI_PROVIDERS.some((entry) => entry.id === providerId),
    )
    .map((providerId) =>
      mapProviderExpense(
        providerId,
        getPlatformAiProviderLabel(providerId),
        "Дополнительный AI провайдер",
        periodByProvider.get(providerId),
        allTimeByProvider.get(providerId),
      ),
    );

  const providersSorted = [...providers, ...extraProviders].sort((left, right) => {
      if (right.periodCostUsd !== left.periodCostUsd) {
        return right.periodCostUsd - left.periodCostUsd;
      }

      return left.label.localeCompare(right.label, "ru");
    });

  const periodTotals = providersSorted.reduce(
    (acc, provider) => ({
      periodCostUsd: acc.periodCostUsd + provider.periodCostUsd,
      periodCalls: acc.periodCalls + provider.periodCalls,
      periodAutoReplies: acc.periodAutoReplies + provider.periodAutoReplies,
      periodVoiceSttCalls: acc.periodVoiceSttCalls + provider.periodVoiceSttCalls,
      periodVoiceTtsCalls: acc.periodVoiceTtsCalls + provider.periodVoiceTtsCalls,
      periodVoiceSttCostUsd:
        acc.periodVoiceSttCostUsd + provider.periodVoiceSttCostUsd,
      periodVoiceTtsCostUsd:
        acc.periodVoiceTtsCostUsd + provider.periodVoiceTtsCostUsd,
    }),
    {
      periodCostUsd: 0,
      periodCalls: 0,
      periodAutoReplies: 0,
      periodVoiceSttCalls: 0,
      periodVoiceTtsCalls: 0,
      periodVoiceSttCostUsd: 0,
      periodVoiceTtsCostUsd: 0,
    },
  );

  const allTimeCostUsd = providersSorted.reduce(
    (sum, provider) => sum + provider.allTimeCostUsd,
    0,
  );

  return {
    period,
    periodLabel: range.label,
    voiceModes: [
      {
        mode: "stt",
        label: "Голос → текст (STT)",
        provider: "openai",
        providerLabel: "OpenAI Whisper",
        periodCostUsd: formatUsd(Number(periodTotalsRow.voice_stt_cost_usd)),
        periodCalls: Number(periodTotalsRow.voice_stt_calls),
      },
      {
        mode: "tts",
        label: "Текст → голос (TTS)",
        provider: "elevenlabs",
        providerLabel: "ElevenLabs",
        periodCostUsd: formatUsd(Number(periodTotalsRow.voice_tts_cost_usd)),
        periodCalls: Number(periodTotalsRow.voice_tts_calls),
      },
    ],
    totals: {
      periodCostUsd: formatUsd(periodTotals.periodCostUsd),
      allTimeCostUsd: formatUsd(allTimeCostUsd),
      periodCalls: periodTotals.periodCalls,
      periodAutoReplies: periodTotals.periodAutoReplies,
      periodVoiceSttCalls: Number(periodTotalsRow.voice_stt_calls),
      periodVoiceTtsCalls: Number(periodTotalsRow.voice_tts_calls),
      periodVoiceSttCostUsd: formatUsd(Number(periodTotalsRow.voice_stt_cost_usd)),
      periodVoiceTtsCostUsd: formatUsd(Number(periodTotalsRow.voice_tts_cost_usd)),
    },
    providers: providersSorted,
  };
}
