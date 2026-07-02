import type { PlatformAdminRole } from "@/features/team/types";

export type BusinessAccountStatus = "active" | "suspended" | "readonly";

export type PlatformBusinessControls = {
  businessId: string;
  accountStatus: BusinessAccountStatus;
  aiEnabled: boolean;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  automationsEnabled: boolean;
  outboundAiEnabled: boolean;
  adminNotes: string;
  updatedAt: string | null;
};

export type BusinessListItem = {
  id: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  ownerEmail: string | null;
  controls: PlatformBusinessControls | null;
  stats: {
    conversations: number;
    messages30d: number;
    aiCostUsd30d: number;
    voiceCalls30d: number;
    connectedChannels: number;
  };
};

export type BusinessDetail = BusinessListItem & {
  businessDescription: string | null;
  website: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  ownerUserId: string;
  channels: BusinessChannelStatus[];
  aiConfig: BusinessAiConfigSnapshot | null;
  voiceConfig: BusinessVoiceConfigSnapshot | null;
  supportThreadId: string | null;
};

export type BusinessChannelStatus = {
  channel: string;
  label: string;
  status: string;
  connected: boolean;
};

export type BusinessAiConfigSnapshot = {
  salesAgentEnabled: boolean;
  autoTaskEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
  followUpAgentEnabled: boolean;
};

export type BusinessVoiceConfigSnapshot = {
  enabled: boolean;
  aiEnabled: boolean;
  smsEnabled: boolean;
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  phoneNumber: string | null;
};

export type BusinessAiExpenseRow = {
  provider: string;
  callType: string;
  totalCostUsd: number;
  callCount: number;
};

export type BusinessDailyMetric = {
  date: string;
  messages: number;
  aiCostUsd: number;
  voiceCalls: number;
};

export type BusinessAnalyticsSeries = {
  days: number;
  totals: {
    messages: number;
    aiCostUsd: number;
    voiceCalls: number;
  };
  series: BusinessDailyMetric[];
};

export function canViewBusinesses(_role: PlatformAdminRole): boolean {
  return true;
}

export function canManageBusinessControls(role: PlatformAdminRole): boolean {
  return role === "owner" || role === "admin" || role === "support";
}

export function canSuspendBusiness(role: PlatformAdminRole): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteBusiness(role: PlatformAdminRole): boolean {
  return role === "owner";
}

export function accountStatusLabel(status: BusinessAccountStatus): string {
  switch (status) {
    case "active":
      return "Активен";
    case "suspended":
      return "Приостановлен";
    case "readonly":
      return "Только чтение";
  }
}

export function planLabel(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "starter") return "Starter";
  if (normalized === "pro") return "Pro";
  if (normalized === "agency") return "Agency";
  if (normalized === "free") return "Free";
  return plan;
}
