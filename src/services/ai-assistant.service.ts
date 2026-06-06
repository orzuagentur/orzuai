import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  MESSAGING_INTEGRATION_CHANNELS,
  isMessagingIntegrationChannel,
} from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import type { AiProvider } from "@/lib/ai/constants";
import { getDefaultGeminiModel, hasGeminiEnv } from "@/lib/env";
import { getAiUsageSummary } from "@/services/ai-usage.service";
import { getProviderAvailability } from "@/services/llm.service";
import { getFollowUpAgentSettings } from "@/services/follow-up-settings.service";
import { getSalesAgentSettings } from "@/services/sales-agent.service";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listAiAgents } from "@/services/ai-agents.service";
import {
  getChannelAiSettingsForBusiness,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import type {
  AiAssistantPageData,
  ApplyGlobalAiDefaultsInput,
  MessagingChannel,
} from "@/types/channel-workspace.types";
import { applyGlobalAiDefaultsSchema } from "@/types/channel-workspace.types";

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

function revalidateAiAssistantPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
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
  activeChannelParam?: string | null,
): Promise<AiAssistantPageData> {
  const defaultModel = getDefaultGeminiModel();
  const channelParam = activeChannelParam as IntegrationChannelId | undefined;
  const activeChannel: MessagingChannel =
    channelParam && isMessagingIntegrationChannel(channelParam)
      ? channelParam
      : "whatsapp";

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      geminiConfigured: hasGeminiEnv(),
      providerAvailability: getProviderAvailability(),
      defaultModel,
      activeChannel,
      channelStatuses: {},
      channels: [],
      agents: [],
      usage: null,
      salesAgent: {
        salesAgentEnabled: false,
        bantThreshold: 70,
        autoQualifyPipeline: true,
        autoTaskEnabled: false,
        autoTaskThreshold: 75,
        sentimentAnalysisEnabled: true,
      },
      followUpAgent: { enabled: true, sentCount: 0 },
    };
  }

  const [channelStatuses, agents, usage, salesAgent, followUpAgent] =
    await Promise.all([
      getChannelConnectionStatuses(businessId),
      listAiAgents(),
      getAiUsageSummary(),
      getSalesAgentSettings(businessId),
      getFollowUpAgentSettings(businessId),
    ]);

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
    providerAvailability: getProviderAvailability(),
    defaultModel,
    activeChannel,
    channelStatuses,
    channels,
    agents,
    usage,
    salesAgent,
    followUpAgent,
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
