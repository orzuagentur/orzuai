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
import { listRecentAgentRuns, getAgentRunsMetrics } from "@/services/analytics-ai-ops.service";
import {
  getAgentAiActivity,
  getAgentDashboardStats,
  listAgentRecentDialogues,
} from "@/services/agent-dashboard.service";
import { isCalendarBookingEnabled } from "@/services/ai-calendar-booking.service";
import { listPublishedBookingPagesForBusinessAdmin } from "@/services/booking-pages.service";
import {
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";
import { isGoogleCalendarConnected } from "@/services/google-calendar.service";
import { getFollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { AiWorkerReadiness } from "@/types/ai-worker-readiness.types";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function getAiWorkerReadiness(businessId: string): Promise<AiWorkerReadiness> {
  const [resources, pages, calendarBookingEnabled, googleCalendarConnected] =
    await Promise.all([
      listBusinessCalendarResources(businessId),
      listPublishedBookingPagesForBusinessAdmin(businessId),
      isCalendarBookingEnabled(businessId),
      isGoogleCalendarConnected(businessId),
    ]);

  return {
    calendarBookingEnabled,
    googleCalendarConnected,
    resourceCount: resources.length,
    bookingPageCount: pages.length,
  };
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
      knowledgeAllEntries: [],
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
      workerReadiness: {
        calendarBookingEnabled: false,
        googleCalendarConnected: false,
        resourceCount: 0,
        bookingPageCount: 0,
      },
      followUpAgent: { enabled: false, sentCount: 0 },
      agentRuns: {
        runsToday: 0,
        runsLast30Days: 0,
        successRatePercent: 0,
        failedRunsLast30Days: 0,
        intentRoutesLast30Days: 0,
        keywordRoutesLast30Days: 0,
        assistantOnlyLast30Days: 0,
        actionsAppliedLast30Days: 0,
        blockedActionsLast30Days: 0,
        skippedDuplicatesLast30Days: 0,
        bookingFailuresLast30Days: 0,
      },
    };
  }

  const knowledgeQuery = input?.q?.trim() ?? "";
  const knowledgeCategory = parseKnowledgeCategory(input?.category);
  const knowledgeHasActiveFilters = Boolean(knowledgeQuery || knowledgeCategory);

  const [
    channelStatuses,
    assistantProfile,
    knowledgeEntries,
    knowledgeAllEntries,
    websiteKnowledgeSync,
    recentAgentRuns,
    agentDashboardStats,
    recentDialogues,
    aiActivity,
    workerReadiness,
    followUpAgent,
    agentRuns,
  ] = await Promise.all([
    getChannelConnectionStatuses(businessId),
    getAiAssistantProfileForBusiness(businessId),
    listKnowledgeEntries(businessId, {
      query: knowledgeQuery,
      category: knowledgeCategory,
    }),
    listKnowledgeEntries(businessId),
    getWebsiteKnowledgeSync(businessId),
    listRecentAgentRuns(businessId, 8),
    getAgentDashboardStats(businessId),
    listAgentRecentDialogues(businessId, 12),
    getAgentAiActivity(businessId, 1),
    getAiWorkerReadiness(businessId),
    getFollowUpAgentSettings(businessId),
    getAgentRunsMetrics(businessId),
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
    knowledgeAllEntries,
    knowledgeHasActiveFilters,
    websiteKnowledgeSync,
    recentAgentRuns,
    agentDashboardStats,
    recentDialogues,
    aiActivity,
    workerReadiness,
    followUpAgent,
    agentRuns,
  };
}
