import type { MessagingChannel, WhatsappStatus } from "./database.types";

export type DashboardUserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: string;
};

export type DashboardMetrics = {
  totalMessages: number;
  uniqueContacts: number;
  aiResponses: number;
  conversionRate: number;
};

export type ActivityDataPoint = {
  label: string;
  value: number;
};

export type RecentConversationItem = {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  updatedAt: string;
};

export type ChannelMetricSummary = {
  channel: MessagingChannel;
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  connected: boolean;
};

export type DashboardOverview = {
  hasBusiness: boolean;
  metrics: DashboardMetrics;
  channelMetrics: ChannelMetricSummary[];
  activity: ActivityDataPoint[];
  recentConversations: RecentConversationItem[];
  whatsappStatus: WhatsappStatus | null;
  whatsappPhoneNumber: string | null;
  aiEnabled: boolean | null;
};

export type AiPerformanceMetrics = {
  aiResolutionRate: number;
  handoffRate: number;
  estimatedMinutesSaved: number;
  aiReplies: number;
  humanReplies: number;
};

export type LeadSourceEntry = {
  channel: MessagingChannel;
  contacts: number;
  percentage: number;
};

export type ResponseTimeMetrics = {
  avgFirstResponseMinutes: number | null;
  avgResolutionHours: number | null;
  sampledConversations: number;
};

export type CrmFunnelStage = {
  stage: string;
  count: number;
  percentage: number;
};

export type CrmFunnelMetrics = {
  stages: CrmFunnelStage[];
  newToQualifiedRate: number;
  qualifiedToWonRate: number;
};

export type TeamAnalyticsMetrics = {
  teamReplies: number;
  aiReplies: number;
  clientMessages: number;
  slaCompliancePercent: number;
  slaTargetMinutes: number;
  sampledConversations: number;
};

export type RevenueMetrics = {
  totalPipelineValue: number;
  wonRevenue: number;
  qualifiedPipelineValue: number;
  openDealsCount: number;
  avgDealSize: number;
};

export type SentimentBreakdown = {
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
};

export type AnalyticsCardConfig = {
  id: keyof DashboardMetrics;
  label: string;
  value: string;
  description: string;
};
