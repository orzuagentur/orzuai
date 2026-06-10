import type { SubscriptionPlanId } from "@/features/subscription/plans";

export type AiUsageSummary = {
  planId: SubscriptionPlanId;
  planLabel: string;
  monthlyLimit: number;
  usedReplies: number;
  remainingReplies: number;
  usagePercent: number;
};

export type AiCostProviderBreakdown = {
  provider: string;
  replies: number;
  costUsd: number;
};

export type AiCostMetrics = {
  totalCostUsd: number;
  monthCostUsd: number;
  totalReplies: number;
  monthReplies: number;
  avgCostPerReplyUsd: number;
  byProvider: AiCostProviderBreakdown[];
  hasCustomBilling: boolean;
};

export type SalesAgentSettings = {
  salesAgentEnabled: boolean;
  bantThreshold: number;
  autoQualifyPipeline: boolean;
  autoTaskEnabled: boolean;
  autoTaskThreshold: number;
  sentimentAnalysisEnabled: boolean;
};
