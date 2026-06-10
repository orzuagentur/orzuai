import type { ActivityDataPoint } from "@/types/dashboard.types";
import type { AnalyticsPeriod, AnalyticsTab } from "@/utils/analytics-url";

export type PulseKpiId =
  | "new_contacts"
  | "ai_reply_share"
  | "avg_first_response"
  | "qualified"
  | "won_revenue";

export type PulseKpi = {
  id: PulseKpiId;
  label: string;
  value: string;
  deltaPercent: number | null;
};

export type AnalyticsAttentionSeverity = "info" | "warning" | "critical";

export type AnalyticsAttentionItem = {
  id: string;
  severity: AnalyticsAttentionSeverity;
  title: string;
  description?: string;
  href: string;
  actionLabel: string;
};

export type AnalyticsPulseData = {
  kpis: PulseKpi[];
  activity: ActivityDataPoint[];
  activityDays: number;
  attention: AnalyticsAttentionItem[];
};

export type AnalyticsPageMeta = {
  activeTab: AnalyticsTab;
  activePeriod: AnalyticsPeriod;
  pulse: AnalyticsPulseData;
};

export type AgentAnalyticsRollupItem = {
  agentId: string;
  agentName: string;
  enabled: boolean;
  contactsServed: number;
  totalAiReplies: number;
  aiRepliesLast7Days: number;
};

export type AutomationOpsTriggerStat = {
  triggerType: string;
  count: number;
};

export type AutomationOpsMetrics = {
  runsToday: number;
  runsLast30Days: number;
  successRatePercent: number;
  failedRunsLast30Days: number;
  topTriggers: AutomationOpsTriggerStat[];
};
