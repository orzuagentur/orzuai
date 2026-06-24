import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  MESSAGING_INTEGRATION_CHANNELS,
  getActiveMessagingChannelIds,
} from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { isInboxMessagingChannel } from "@/features/integrations/constants";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import { parseAiAssistantSearchParams } from "@/utils/ai-assistant-url";
import type { AiAssistantTab } from "@/utils/ai-assistant-url";
import type { AiProvider } from "@/lib/ai/constants";
import { getDefaultGeminiModel, hasElevenLabsEnv, hasGeminiEnv } from "@/lib/env";
import { mergeProviderAvailability } from "@/features/ai-assistant/provider-availability";
import {
  getBusinessPreferCustomerAiKeys,
  listBusinessProviderCredentials,
} from "@/services/business-ai-credentials.service";
import { getProviderAvailability } from "@/services/llm.service";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
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
import type {
  AiAssistantPageData,
  ApplyGlobalAiDefaultsInput,
} from "@/types/channel-workspace.types";
import { applyGlobalAiDefaultsSchema } from "@/types/channel-workspace.types";

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

function revalidateAiAssistantPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(DASHBOARD_ROUTES.aiAssistantSection);
  revalidatePath(DASHBOARD_ROUTES.aiAgentsSection);
  revalidatePath(APP_ROUTES.dashboard);
  for (const channel of MESSAGING_CHANNELS) {
    revalidatePath(`${DASHBOARD_ROUTES.integrations}/${channel}`);
  }
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getAiAssistantPageData(
  input?: {
    channel?: string;
    tab?: string;
    agent?: string;
    step?: string;
    goal?: string;
    q?: string;
    setup?: string;
    edit?: string;
    analytics?: string;
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
  const platformProviderAvailability = getProviderAvailability();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      geminiConfigured: hasGeminiEnv(),
      elevenLabsConfigured: hasElevenLabsEnv(),
      providerAvailability: platformProviderAvailability,
      platformProviderAvailability,
      businessProviderCredentials: [],
      preferCustomerAiKeys: false,
      defaultModel,
      activeChannel: "whatsapp",
      activeChannelFilter:
        parsed.activeChannel && isInboxMessagingChannel(parsed.activeChannel)
          ? parsed.activeChannel
          : null,
      activeTab: parsed.activeTab,
      activeAgentId: parsed.activeAgentId,
      isNewAgent: parsed.isNewAgent,
      createWizardStep: parsed.createWizardStep,
      createWizardGoal: parsed.createWizardGoal,
      searchQuery: parsed.searchQuery,
      showSetupBanner: parsed.showSetupBanner,
      isEditingAgent: parsed.isEditingAgent,
      isViewingAnalytics: parsed.isViewingAnalytics,
      isEditingAssistant: parsed.isEditingAssistant,
      visibleChannelIds: [],
      channelStatuses: {},
      channels: [],
      agents: [],
      enabledChannelCount: 0,
      connectedChannelCount: 0,
      assistantProfile: null,
      knowledgeEntries: [],
      knowledgeHasActiveFilters: false,
      websiteKnowledgeSync: null,
      recentAgentRuns: [],
    };
  }

  const knowledgeQuery = input?.q?.trim() ?? "";
  const knowledgeCategory = parseKnowledgeCategory(input?.category);
  const knowledgeHasActiveFilters = Boolean(knowledgeQuery || knowledgeCategory);

  const [
    channelStatuses,
    businessProviderCredentials,
    preferCustomerAiKeys,
    assistantProfile,
    knowledgeEntries,
    websiteKnowledgeSync,
    recentAgentRuns,
  ] = await Promise.all([
    getChannelConnectionStatuses(businessId),
    listBusinessProviderCredentials(businessId),
    getBusinessPreferCustomerAiKeys(businessId),
    getAiAssistantProfileForBusiness(businessId),
    listKnowledgeEntries(businessId, {
      query: knowledgeQuery,
      category: knowledgeCategory,
    }),
    getWebsiteKnowledgeSync(businessId),
    listRecentAgentRuns(businessId, 8),
  ]);

  const providerAvailability = mergeProviderAvailability(
    platformProviderAvailability,
    businessProviderCredentials,
  );

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
    platformProviderAvailability,
    businessProviderCredentials,
    preferCustomerAiKeys,
    defaultModel,
    activeChannel,
    activeChannelFilter:
      parsed.activeChannel && isInboxMessagingChannel(parsed.activeChannel)
        ? parsed.activeChannel
        : null,
    activeTab: parsed.activeTab,
    activeAgentId: parsed.activeAgentId,
    isNewAgent: parsed.isNewAgent,
    createWizardStep: parsed.createWizardStep,
    createWizardGoal: parsed.createWizardGoal,
    searchQuery: parsed.searchQuery,
    showSetupBanner: parsed.showSetupBanner,
    isEditingAgent: parsed.isEditingAgent,
    isViewingAnalytics: parsed.isViewingAnalytics,
    isEditingAssistant: parsed.isEditingAssistant,
    visibleChannelIds,
    channelStatuses,
    channels,
    agents: [],
    enabledChannelCount: channels.filter((entry) => entry.settings.aiEnabled).length,
    connectedChannelCount: channels.filter(
      (entry) => entry.settings.isChannelConnected,
    ).length,
    assistantProfile,
    knowledgeEntries,
    knowledgeHasActiveFilters,
    websiteKnowledgeSync,
    recentAgentRuns,
  };
}

export async function applyGlobalAiDefaults(
  input: ApplyGlobalAiDefaultsInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = applyGlobalAiDefaultsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid defaults.",
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();

  for (const channel of MESSAGING_CHANNELS) {
    const { data } = await supabase
      .from("ai_settings")
      .select("id")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .maybeSingle();

    if (!data) {
      await supabase.from("ai_settings").insert({
        business_id: businessId,
        channel,
        provider: parsed.data.provider,
        model: parsed.data.model,
        language: parsed.data.language,
        system_prompt: parsed.data.systemPrompt,
        ai_enabled: parsed.data.applyAiEnabled
          ? (parsed.data.aiEnabled ?? false)
          : false,
      });
    }
  }

  const updatePayload: {
    provider: AiProvider;
    model: string;
    language: string;
    system_prompt: string;
    ai_enabled?: boolean;
  } = {
    provider: parsed.data.provider,
    model: parsed.data.model,
    language: parsed.data.language,
    system_prompt: parsed.data.systemPrompt,
  };

  if (parsed.data.applyAiEnabled && parsed.data.aiEnabled !== undefined) {
    updatePayload.ai_enabled = parsed.data.aiEnabled;
  }

  const { error } = await supabase
    .from("ai_settings")
    .update(updatePayload)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateAiAssistantPaths();

  return { success: true };
}
