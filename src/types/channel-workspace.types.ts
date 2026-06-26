import { z } from "zod";

import type { IntegrationChannelStatusMap } from "@/features/integrations/channel-status";
import type {
  AgentAnalyticsRollupItem,
  AnalyticsPulseData,
  AgentRunListItem,
  AgentRunsMetrics,
  AutomationOpsMetrics,
} from "./analytics.types";
import type {
  AiPerformanceMetrics,
  CrmFunnelMetrics,
  LeadSourceEntry,
  ResponseTimeMetrics,
  RevenueMetrics,
  SentimentBreakdown,
  TeamAnalyticsMetrics,
} from "./dashboard.types";
import type { AnalyticsPeriod, AnalyticsTab } from "@/utils/analytics-url";
import type { AiAssistantProfileData } from "./ai-assistant-profile.types";
import type {
  AgentActivityPoint,
  AgentDashboardStats,
  AgentRecentDialogue,
} from "./agent-dashboard.types";
import type { KnowledgeEntryData } from "./knowledge.types";
import type { WebsiteKnowledgeSyncData } from "./website-knowledge.types";
import type { AiAssistantTab } from "@/utils/ai-assistant-url";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { AiCostMetrics } from "./ai-usage.types";
import type { MessageSenderType, MessagingChannel } from "./database.types";

export type { MessagingChannel };

export {
  AI_LANGUAGE_OPTIONS,
  AI_REPLY_LANGUAGE_OPTIONS,
  MULTILINGUAL_LANGUAGE_VALUE,
} from "@/lib/ai/languages";

export const saveChannelAiSettingsSchema = z.object({
  channel: z.enum([
    MESSAGING_INTEGRATION_CHANNELS[0],
    ...MESSAGING_INTEGRATION_CHANNELS.slice(1),
  ]),
  aiEnabled: z.boolean(),
});

export const testChannelAiReplySchema = z.object({
  channel: z.enum([
    MESSAGING_INTEGRATION_CHANNELS[0],
    ...MESSAGING_INTEGRATION_CHANNELS.slice(1),
  ]),
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
  channel: MessagingIntegrationChannelId;
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
  channel: MessagingIntegrationChannelId;
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
  channel: MessagingIntegrationChannelId;
  settings: ChannelAiSettingsData;
};

export type AiAssistantPageData = {
  hasBusiness: boolean;
  geminiConfigured: boolean;
  elevenLabsConfigured: boolean;
  providerAvailability: AiProviderAvailability;
  defaultModel: string;
  activeChannel: MessagingIntegrationChannelId;
  activeChannelFilter: MessagingIntegrationChannelId | null;
  activeTab: AiAssistantTab;
  searchQuery: string;
  showSetupBanner: boolean;
  isEditingAssistant: boolean;
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  channels: AiAssistantChannelEntry[];
  enabledChannelCount: number;
  connectedChannelCount: number;
  assistantProfile: AiAssistantProfileData | null;
  knowledgeEntries: KnowledgeEntryData[];
  knowledgeHasActiveFilters: boolean;
  websiteKnowledgeSync: WebsiteKnowledgeSyncData | null;
  recentAgentRuns: AgentRunListItem[];
  agentDashboardStats: AgentDashboardStats;
  recentDialogues: AgentRecentDialogue[];
  aiActivity: AgentActivityPoint[];
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
  channel: MessagingIntegrationChannelId;
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
  channel: MessagingIntegrationChannelId;
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
  activeTab: AnalyticsTab;
  activePeriod: AnalyticsPeriod;
  pulse: AnalyticsPulseData;
  activeChannelId: MessagingChannel | null;
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
  agentsRollup: AgentAnalyticsRollupItem[];
  automationOps: AutomationOpsMetrics;
  agentRuns: AgentRunsMetrics;
  recentAgentRuns: AgentRunListItem[];
};

export type ChannelWorkspaceSummary = {
  contactsCount: number;
  aiEnabled: boolean;
  totalMessages: number;
};
