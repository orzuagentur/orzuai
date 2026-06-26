import "server-only";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  getActiveMessagingChannelIds,
} from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { isInboxMessagingChannel } from "@/features/integrations/constants";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import { parseAiAssistantSearchParams } from "@/utils/ai-assistant-url";
import type { AiAssistantTab } from "@/utils/ai-assistant-url";
import { getDefaultGeminiModel, hasElevenLabsEnv, hasGeminiEnv } from "@/lib/env";
import { getProviderAvailability } from "@/services/llm.service";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getAiAssistantProfileForBusiness } from "@/services/ai-assistant-profile.service";
import {
  getChannelAiSettingsForBusiness,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import { listKnowledgeEntries, parseKnowledgeCategory } from "@/services/knowledge.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";
import { listRecentAgentRuns } from "@/services/analytics-ai-ops.service";
import {
  getAgentAiActivity,
  getAgentDashboardStats,
  listAgentRecentDialogues,
} from "@/services/agent-dashboard.service";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getAiAssistantPageData(
  input?: {
    channel?: string;
    tab?: string;
    q?: string;
    setup?: string;
    assistantEdit?: string;
    category?: string;
  },
  options?: { section?: AiAssistantTab },
): Promise<AiAssistantPageData> {
  const defaultModel = getDefaultGeminiModel();
  const parsed = parseAiAssistantSearchParams(input ?? {}, {
    section: options?.section,
  });
  const businessId = await getOwnedBusinessId();
  const providerAvailability = getProviderAvailability();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      geminiConfigured: hasGeminiEnv(),
      elevenLabsConfigured: hasElevenLabsEnv(),
      providerAvailability,
      defaultModel,
      activeChannel: "whatsapp",
      activeChannelFilter:
        parsed.activeChannel && isInboxMessagingChannel(parsed.activeChannel)
          ? parsed.activeChannel
          : null,
      activeTab: parsed.activeTab,
      searchQuery: parsed.searchQuery,
      showSetupBanner: parsed.showSetupBanner,
      isEditingAssistant: parsed.isEditingAssistant,
      visibleChannelIds: [],
      channelStatuses: {},
      channels: [],
      enabledChannelCount: 0,
      connectedChannelCount: 0,
      assistantProfile: null,
      knowledgeEntries: [],
      knowledgeHasActiveFilters: false,
      websiteKnowledgeSync: null,
      recentAgentRuns: [],
      agentDashboardStats: {
        aiTextReplies: 0,
        voiceAiReplies: 0,
        voiceAiReplyMinutes: 0,
        totalCallMinutes: 0,
        contactsServed: 0,
      },
      recentDialogues: [],
      aiActivity: [],
    };
  }

  const knowledgeQuery = input?.q?.trim() ?? "";
  const knowledgeCategory = parseKnowledgeCategory(input?.category);
  const knowledgeHasActiveFilters = Boolean(knowledgeQuery || knowledgeCategory);

  const [
    channelStatuses,
    assistantProfile,
    knowledgeEntries,
    websiteKnowledgeSync,
    recentAgentRuns,
    agentDashboardStats,
    recentDialogues,
    aiActivity,
  ] = await Promise.all([
    getChannelConnectionStatuses(businessId),
    getAiAssistantProfileForBusiness(businessId),
    listKnowledgeEntries(businessId, {
      query: knowledgeQuery,
      category: knowledgeCategory,
    }),
    getWebsiteKnowledgeSync(businessId),
    listRecentAgentRuns(businessId, 8),
    getAgentDashboardStats(businessId),
    listAgentRecentDialogues(businessId, 12),
    getAgentAiActivity(businessId, 1),
  ]);

  const visibleChannelIds = getActiveMessagingChannelIds(channelStatuses);
  const activeChannel: MessagingIntegrationChannelId =
    parsed.activeChannel &&
    isInboxMessagingChannel(parsed.activeChannel) &&
    visibleChannelIds.includes(parsed.activeChannel)
      ? parsed.activeChannel
      : visibleChannelIds[0] ?? "whatsapp";

  const channels = await Promise.all(
    MESSAGING_CHANNELS.map(async (channel) => ({
      channel,
      settings: await getChannelAiSettingsForBusiness(
        businessId,
        channel,
        isChannelConnectedForWorkspace(channel, channelStatuses),
      ),
    })),
  );

  return {
    hasBusiness: true,
    geminiConfigured: hasGeminiEnv(),
    elevenLabsConfigured: hasElevenLabsEnv(),
    providerAvailability,
    defaultModel,
    activeChannel,
    activeChannelFilter:
      parsed.activeChannel && isInboxMessagingChannel(parsed.activeChannel)
        ? parsed.activeChannel
        : null,
    activeTab: parsed.activeTab,
    searchQuery: parsed.searchQuery,
    showSetupBanner: parsed.showSetupBanner,
    isEditingAssistant: parsed.isEditingAssistant,
    visibleChannelIds,
    channelStatuses,
    channels,
    enabledChannelCount: channels.filter((entry) => entry.settings.aiEnabled).length,
    connectedChannelCount: channels.filter(
      (entry) => entry.settings.isChannelConnected,
    ).length,
    assistantProfile,
    knowledgeEntries,
    knowledgeHasActiveFilters,
    websiteKnowledgeSync,
    recentAgentRuns,
    agentDashboardStats,
    recentDialogues,
    aiActivity,
  };
}
