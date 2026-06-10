import { z } from "zod";

import { AI_PROVIDERS } from "@/lib/ai/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations/channel-status";
import type {
  AiPerformanceMetrics,
  CrmFunnelMetrics,
  LeadSourceEntry,
  ResponseTimeMetrics,
  RevenueMetrics,
  SentimentBreakdown,
  TeamAnalyticsMetrics,
} from "./dashboard.types";
import type { AiAgentItem } from "./ai-agent.types";
import type { AiAssistantTab } from "@/utils/ai-assistant-url";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { AiCostMetrics, AiUsageSummary, SalesAgentSettings } from "./ai-usage.types";
import type { MessageSenderType, MessagingChannel } from "./database.types";

export type { MessagingChannel };

export const AI_LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Russian", label: "Русский" },
  { value: "Uzbek", label: "O'zbek" },
] as const;

export const saveChannelAiSettingsSchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram", "website_forms"]),
  aiEnabled: z.boolean(),
  provider: z.enum(AI_PROVIDERS),
  model: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1, "Language is required.").max(32),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000, "Instructions are too long."),
});

export const applyGlobalAiDefaultsSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1).max(32),
  systemPrompt: z.string().trim().min(20).max(4000),
  applyAiEnabled: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
});

export type ApplyGlobalAiDefaultsInput = z.infer<typeof applyGlobalAiDefaultsSchema>;

export const testChannelAiReplySchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram", "website_forms"]),
  testMessage: z
    .string()
    .trim()
    .min(1, "Enter a sample customer message.")
    .max(2000, "Message is too long."),
});

export type SaveChannelAiSettingsInput = z.infer<typeof saveChannelAiSettingsSchema>;
export type TestChannelAiReplyInput = z.infer<typeof testChannelAiReplySchema>;

export type ChannelContactItem = {
  id: string;
  name: string;
  identifier: string;
  lastMessageAt: string | null;
};

export type ChannelContactsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  contacts: ChannelContactItem[];
  total: number;
};

export type AiProviderAvailability = {
  gemini: boolean;
  openai: boolean;
  claude: boolean;
};

export type ChannelAiSettingsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  aiEnabled: boolean;
  provider: string;
  model: string;
  language: string;
  systemPrompt: string;
  isConfigured: boolean;
  geminiConfigured: boolean;
  providerAvailability: AiProviderAvailability;
  isChannelConnected: boolean;
  defaultModel: string;
};

export type AiAssistantChannelEntry = {
  channel: MessagingChannel;
  settings: ChannelAiSettingsData;
};

export type AiAssistantPageData = {
  hasBusiness: boolean;
  geminiConfigured: boolean;
  providerAvailability: AiProviderAvailability;
  defaultModel: string;
  activeChannel: MessagingChannel;
  activeChannelFilter: MessagingChannel | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  isNewAgent: boolean;
  activeAgentPick: string | null;
  searchQuery: string;
  showSetupBanner: boolean;
  isEditingAgent: boolean;
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  channels: AiAssistantChannelEntry[];
  agents: AiAgentItem[];
  usage: AiUsageSummary | null;
  salesAgent: SalesAgentSettings;
  followUpAgent: FollowUpAgentSettings;
};

export type ChannelAnalyticsActivityPoint = {
  label: string;
  value: number;
};

export type ChannelRecentMessage = {
  id: string;
  preview: string;
  senderType: MessageSenderType;
  createdAt: string;
  contactName: string;
};

export type ChannelAnalyticsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  manualReplies: number;
  activeConversations: number;
  conversionRate: number;
  activity: ChannelAnalyticsActivityPoint[];
  recentMessages: ChannelRecentMessage[];
};

export type AnalyticsChannelEntry = {
  channel: MessagingChannel;
  analytics: ChannelAnalyticsData;
  isChannelConnected: boolean;
};

export type AnalyticsTotals = {
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  activeConversations: number;
};

export type AnalyticsPageData = {
  hasBusiness: boolean;
  activeChannel: MessagingChannel;
  channelStatuses: IntegrationChannelStatusMap;
  channels: AnalyticsChannelEntry[];
  totals: AnalyticsTotals;
  aiPerformance: AiPerformanceMetrics;
  leadSources: LeadSourceEntry[];
  responseTime: ResponseTimeMetrics;
  crmFunnel: CrmFunnelMetrics;
  aiCost: AiCostMetrics;
  teamAnalytics: TeamAnalyticsMetrics;
  revenue: RevenueMetrics;
  sentiment: SentimentBreakdown;
};

export type ChannelWorkspaceSummary = {
  contactsCount: number;
  aiEnabled: boolean;
  totalMessages: number;
};
