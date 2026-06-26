import type { AnalyticsPeriod } from "@/features/dashboard/period";

export type ChannelConnectionStat = {
  channel: string;
  label: string;
  connected: number;
};

export type PlanRevenueStat = {
  plan: string;
  label: string;
  count: number;
  revenueUsd: number;
};

export type PlatformDashboardMetrics = {
  users: {
    total: number;
    newThisMonth: number;
  };
  businesses: {
    total: number;
    withStripe: number;
    activeSubscriptions: number;
  };
  channels: {
    totalConnected: number;
    byChannel: ChannelConnectionStat[];
  };
  messaging: {
    totalMessages: number;
    aiReplies: number;
    monthMessages: number;
    monthAiReplies: number;
  };
  contacts: {
    total: number;
    newThisMonth: number;
  };
  subscriptions: {
    estimatedMrrUsd: number;
    byPlan: PlanRevenueStat[];
  };
  ai: {
    totalCostUsd: number;
    monthCostUsd: number;
    totalCalls: number;
    monthCalls: number;
    platformBillingCalls: number;
  };
};

export type AiDailyActivity = {
  date: string;
  calls: number;
  costUsd: number;
  replies: number;
};

export type VoiceModeExpense = {
  mode: "stt" | "tts";
  label: string;
  provider: string;
  providerLabel: string;
  periodCostUsd: number;
  periodCalls: number;
};

export type AiProviderExpense = {
  provider: string;
  label: string;
  description: string;
  periodCostUsd: number;
  allTimeCostUsd: number;
  periodCalls: number;
  periodAutoReplies: number;
  periodVoiceSttCalls: number;
  periodVoiceTtsCalls: number;
  periodVoiceSttCostUsd: number;
  periodVoiceTtsCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  lastActivityAt: string | null;
  dailyActivity: AiDailyActivity[];
  hasActivity: boolean;
};

export type AiExpensesOverview = {
  period: AnalyticsPeriod;
  periodLabel: string;
  voiceModes: VoiceModeExpense[];
  totals: {
    periodCostUsd: number;
    allTimeCostUsd: number;
    periodCalls: number;
    periodAutoReplies: number;
    periodVoiceSttCalls: number;
    periodVoiceTtsCalls: number;
    periodVoiceSttCostUsd: number;
    periodVoiceTtsCostUsd: number;
  };
  providers: AiProviderExpense[];
};
