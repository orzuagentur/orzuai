import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { INTEGRATION_CHANNELS, isIntegrationChannelId } from "@/features/integrations";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import { getDefaultGeminiModel, hasGeminiEnv } from "@/lib/env";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
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

const MESSAGING_CHANNELS = INTEGRATION_CHANNELS;

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
  const activeChannel: MessagingChannel =
    activeChannelParam && isIntegrationChannelId(activeChannelParam)
      ? activeChannelParam
      : "whatsapp";

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      geminiConfigured: hasGeminiEnv(),
      defaultModel,
      activeChannel,
      channelStatuses: {},
      channels: [],
    };
  }

  const channelStatuses = await getChannelConnectionStatuses(businessId);

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
    defaultModel,
    activeChannel,
    channelStatuses,
    channels,
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
    model: string;
    language: string;
    system_prompt: string;
    ai_enabled?: boolean;
  } = {
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
