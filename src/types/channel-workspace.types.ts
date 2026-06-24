import { z } from "zod";

import { AI_PROVIDERS } from "@/lib/ai/constants";
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
import type { AiAgentItem } from "./ai-agent.types";
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
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type { MessageSenderType, MessagingChannel } from "./database.types";

export type { MessagingChannel };

export const AI_LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Russian", label: "Русский" },
  { value: "Uzbek", label: "O'zbek" },
] as const;

export const saveChannelAiSettingsSchema = z.object({
  channel: z.enum([
    MESSAGING_INTEGRATION_CHANNELS[0],
    ...MESSAGING_INTEGRATION_CHANNELS.slice(1),
  ]),
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
  platformProviderAvailability: AiProviderAvailability;
  businessProviderCredentials: BusinessProviderCredential[];
  preferCustomerAiKeys: boolean;
  defaultModel: string;
  activeChannel: MessagingIntegrationChannelId;
  activeChannelFilter: MessagingIntegrationChannelId | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  isNewAgent: boolean;
  createWizardStep: 1 | 2 | 3 | 4 | 5;
  createWizardGoal: string | null;
  searchQuery: string;
  showSetupBanner: boolean;
  isEditingAgent: boolean;
  isViewingAnalytics: boolean;
  isEditingAssistant: boolean;
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  channels: AiAssistantChannelEntry[];
  agents: AiAgentItem[];
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
