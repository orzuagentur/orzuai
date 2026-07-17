import { z } from "zod";

import type { AnalyticsPulseData } from "./analytics.types";
import type {
  AgentRunListItem,
  AgentRunsMetrics,
} from "./analytics.types";
import type {
  CrmFunnelMetrics,
  RevenueMetrics,
} from "./dashboard.types";
import type { AnalyticsPeriod } from "@/utils/analytics-url";
import type {
  AnalyticsCallsChartPoint,
  AnalyticsChartPoint,
} from "./analytics-chart.types";
import type { AiAssistantProfileData } from "./ai-assistant-profile.types";
import type {
  AgentActivityPoint,
  AgentDashboardStats,
  AgentRecentDialogue,
} from "./agent-dashboard.types";
import type { KnowledgeEntryData } from "./knowledge.types";
import type { KnowledgeCategoryCard } from "./knowledge-category.types";
import type { WebsiteKnowledgeSyncData } from "./website-knowledge.types";
import type { AiAssistantTab } from "@/utils/ai-assistant-url";
import type { AiAgentChannelId } from "@/features/integrations/constants";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import {
  AI_AGENT_CHANNELS,
  MESSAGING_INTEGRATION_CHANNELS,
} from "@/features/integrations/constants";
import type { MessageSenderType, MessagingChannel } from "./database.types";
import { REPLY_WAIT_MS_OPTIONS } from "@/lib/ai/languages";
import type { IntegrationChannelStatusMap } from "@/features/integrations/channel-status";
import type { AiWorkerReadiness } from "@/types/ai-worker-readiness.types";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { BusinessAiKeySettings } from "@/services/business-ai-keys.service";
import type { SalesAgentSettings } from "@/types/ai-usage.types";

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

const replyWaitValues = REPLY_WAIT_MS_OPTIONS as [number, ...number[]];

export const saveChannelAiBehaviorSchema = z.object({
  channel: z.enum([
    AI_AGENT_CHANNELS[0],
    ...AI_AGENT_CHANNELS.slice(1),
  ]),
  replyWaitMs: z
    .number()
    .int()
    .refine((value) => replyWaitValues.includes(value), {
      message: "Select a reply wait time.",
    }),
  canCreateTask: z.boolean(),
  canCreateDeal: z.boolean(),
  canUpdateContact: z.boolean(),
  canAddNote: z.boolean(),
  canAddInternalNote: z.boolean(),
  canCreateCalendarEvent: z.boolean(),
  canRequestHuman: z.boolean(),
  canNotifyOwner: z.boolean(),
  canNotifyOnActions: z.boolean(),
  canSummarizeActionsInChat: z.boolean(),
  canSendProactiveMessage: z.boolean(),
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
export type SaveChannelAiBehaviorInput = z.infer<typeof saveChannelAiBehaviorSchema>;
export type TestChannelAiReplyInput = z.infer<typeof testChannelAiReplySchema>;

export type ChannelAiBehaviorPermissions = {
  canCreateTask: boolean;
  canCreateDeal: boolean;
  canUpdateContact: boolean;
  canAddNote: boolean;
  canAddInternalNote: boolean;
  canCreateCalendarEvent: boolean;
  canRequestHuman: boolean;
  canNotifyOwner: boolean;
  canNotifyOnActions: boolean;
  canSummarizeActionsInChat: boolean;
  canSendProactiveMessage: boolean;
};

export type ChannelAiBehaviorSettings = ChannelAiBehaviorPermissions & {
  replyWaitMs: number;
  overridesEnabled: boolean;
};

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
  channel: AiAgentChannelId;
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
  behavior: ChannelAiBehaviorSettings;
};

export type AiAssistantChannelEntry = {
  channel: AiAgentChannelId;
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
  knowledgeAllEntries: KnowledgeEntryData[];
  knowledgeCategories: KnowledgeCategoryCard[];
  knowledgeHasActiveFilters: boolean;
  websiteKnowledgeSync: WebsiteKnowledgeSyncData | null;
  recentAgentRuns: AgentRunListItem[];
  agentDashboardStats: AgentDashboardStats;
  recentDialogues: AgentRecentDialogue[];
  aiActivity: AgentActivityPoint[];
  workerReadiness: AiWorkerReadiness;
  followUpAgent: FollowUpAgentSettings;
  salesAgent: SalesAgentSettings;
  businessAiKeys: BusinessAiKeySettings;
  agentRuns: AgentRunsMetrics;
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
  activePeriod: AnalyticsPeriod;
  pulse: AnalyticsPulseData;
  channelStatuses: IntegrationChannelStatusMap;
  crmFunnel: CrmFunnelMetrics;
  revenue: RevenueMetrics;
  messageSeries: AnalyticsChartPoint[];
  clientSeries: AnalyticsChartPoint[];
  dealSeries: AnalyticsChartPoint[];
  callSeries: AnalyticsCallsChartPoint[];
};

export type ChannelWorkspaceSummary = {
  contactsCount: number;
  aiEnabled: boolean;
  totalMessages: number;
};
