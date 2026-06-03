import "server-only";

import type { IntegrationChannelId } from "@/features/integrations";
import { hasSupabaseEnv } from "@/lib/env";
import { getDefaultGeminiModel } from "@/lib/env.schema";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  buildIntegrationChannelStatuses,
  isChannelConnectedForWorkspace,
} from "@/features/integrations/channel-status";
import { getInstagramConnection } from "@/services/instagram.service";
import { getTelegramConnection } from "@/services/telegram.service";
import { getWhatsAppConnection } from "@/services/whatsapp.service";
import type {
  ChannelAiSettingsData,
  ChannelAnalyticsData,
  ChannelContactsData,
  ChannelWorkspaceSummary,
  MessagingChannel,
} from "@/types/channel-workspace.types";
import { calculateConversionRate } from "@/utils/dashboard";

const DEFAULT_AI_LANGUAGE = "en";
const DEFAULT_AI_SYSTEM_PROMPT =
  "You are a helpful customer support assistant for a small business.";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getChannelConnectionStatuses(businessId: string) {
  const [whatsapp, instagram, telegram] = await Promise.all([
    getWhatsAppConnection(businessId),
    getInstagramConnection(businessId),
    getTelegramConnection(businessId),
  ]);

  return buildIntegrationChannelStatuses({
    whatsappConnection: whatsapp,
    instagramConnection: instagram,
    telegramConnection: telegram,
  });
}

export async function getChannelWorkspaceSummary(
  businessId: string,
  channel: MessagingChannel,
): Promise<ChannelWorkspaceSummary> {
  if (!hasSupabaseEnv()) {
    return { contactsCount: 0, aiEnabled: false, totalMessages: 0 };
  }

  const supabase = await createClient();

  const [contactsResult, aiResult, analyticsResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("channel", channel),
    supabase
      .from("ai_settings")
      .select("ai_enabled")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .maybeSingle(),
    supabase
      .from("channel_analytics")
      .select("total_messages")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .maybeSingle(),
  ]);

  return {
    contactsCount: contactsResult.count ?? 0,
    aiEnabled: aiResult.data?.ai_enabled ?? false,
    totalMessages: analyticsResult.data?.total_messages ?? 0,
  };
}

export async function getChannelContacts(
  channel: MessagingChannel,
): Promise<ChannelContactsData> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      channel,
      contacts: [],
      total: 0,
    };
  }

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("contacts")
    .select("id, name, phone_number, last_message_at")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  return {
    hasBusiness: true,
    channel,
    total: count ?? data?.length ?? 0,
    contacts:
      data?.map((row) => ({
        id: row.id,
        name: row.name,
        identifier: row.phone_number,
        lastMessageAt: row.last_message_at,
      })) ?? [],
  };
}

export async function getChannelAiSettings(
  channel: MessagingChannel,
): Promise<ChannelAiSettingsData> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      channel,
      aiEnabled: false,
      model: getDefaultGeminiModel(),
      language: DEFAULT_AI_LANGUAGE,
      isConfigured: false,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("ai_enabled, model, language")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  if (!data) {
    await supabase.from("ai_settings").insert({
      business_id: businessId,
      channel,
      model: getDefaultGeminiModel(),
      language: DEFAULT_AI_LANGUAGE,
      system_prompt: DEFAULT_AI_SYSTEM_PROMPT,
      ai_enabled: false,
    });

    return {
      hasBusiness: true,
      channel,
      aiEnabled: false,
      model: getDefaultGeminiModel(),
      language: DEFAULT_AI_LANGUAGE,
      isConfigured: true,
    };
  }

  return {
    hasBusiness: true,
    channel,
    aiEnabled: data.ai_enabled,
    model: data.model,
    language: data.language,
    isConfigured: true,
  };
}

export async function getChannelAnalytics(
  channel: MessagingChannel,
): Promise<ChannelAnalyticsData> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      channel,
      totalMessages: 0,
      totalContacts: 0,
      aiReplies: 0,
      conversionRate: 0,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_analytics")
    .select("total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  const totalMessages = data?.total_messages ?? 0;
  const totalContacts = data?.total_contacts ?? 0;
  const aiReplies = data?.ai_replies ?? 0;

  return {
    hasBusiness: true,
    channel,
    totalMessages,
    totalContacts,
    aiReplies,
    conversionRate: calculateConversionRate(totalMessages, aiReplies),
  };
}

export async function isChannelWorkspaceReady(
  businessId: string,
  channel: IntegrationChannelId,
): Promise<boolean> {
  const statuses = await getChannelConnectionStatuses(businessId);
  return isChannelConnectedForWorkspace(channel, statuses);
}

export async function updateChannelAiEnabled(
  channel: MessagingChannel,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_settings")
    .update({ ai_enabled: enabled })
    .eq("business_id", businessId)
    .eq("channel", channel);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}
