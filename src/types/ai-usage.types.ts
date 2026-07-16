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
};

export type SalesAgentSettings = {
  salesAgentEnabled: boolean;
  bantThreshold: number;
  autoQualifyPipeline: boolean;
  autoTaskEnabled: boolean;
  autoTaskThreshold: number;
  autoDealEnabled: boolean;
  autoDealThreshold: number;
  sentimentAnalysisEnabled: boolean;
};

export type SalesAgentRuleTestResult = {
  success: boolean;
  message?: string;
  averageScore?: number;
  evaluation?: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
    summary: string;
    suggestedAction: string;
  };
  plannedActions?: string[];
};
