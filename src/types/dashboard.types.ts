import type { WhatsappStatus } from "./database.types";

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

export type DashboardOverview = {
  hasBusiness: boolean;
  metrics: DashboardMetrics;
  activity: ActivityDataPoint[];
  recentConversations: RecentConversationItem[];
  whatsappStatus: WhatsappStatus | null;
  whatsappPhoneNumber: string | null;
  aiEnabled: boolean | null;
};

export type AnalyticsCardConfig = {
  id: keyof DashboardMetrics;
  label: string;
  value: string;
  description: string;
};
