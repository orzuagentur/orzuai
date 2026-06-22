import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import type { IntegrationChannelId, MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import {
  buildIntegrationChannelStatuses,
  isChannelConnectedForWorkspace,
} from "@/features/integrations/channel-status";
import { resolveAiModel, type AiProvider } from "@/lib/ai/constants";
import { getDefaultGeminiModel, hasGeminiEnv } from "@/lib/env";
import { resolveGeminiModel } from "@/lib/gemini/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getProviderAvailability,
  isProviderConfigured,
} from "@/services/llm.service";
import { generateFastAssistantReply } from "@/services/auto-reply-pipeline.service";
import { getGmailConnection } from "@/services/gmail-integration.service";
import { getGoogleCalendarConnection } from "@/services/google-calendar.service";
import { getTelegramConnection } from "@/services/telegram.service";
import { getWebsiteFormConnection } from "@/services/website-forms.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";
import { getVoiceConnection } from "@/services/voice-agent.service";
import { getWhatsAppConnection } from "@/services/whatsapp.service";
import type {
  ChannelAiSettingsData,
  ChannelAnalyticsData,
  ChannelContactsData,
  ChannelWorkspaceSummary,
  SaveChannelAiSettingsInput,
  TestChannelAiReplyInput,
} from "@/types/channel-workspace.types";
import {
  saveChannelAiSettingsSchema,
  testChannelAiReplySchema,
} from "@/types/channel-workspace.types";
import {
  buildLastSevenDaysActivity,
  calculateConversionRate,
} from "@/utils/dashboard";

export async function enableAiForChannels(
  businessId: string,
  channels: MessagingIntegrationChannelId[],
): Promise<void> {
  if (!hasSupabaseEnv() || channels.length === 0) {
    return;
  }

  const supabase = await createClient();

  for (const channel of channels) {
    await ensureChannelAiSettings(supabase, businessId, channel);
  }

  await supabase
    .from("ai_settings")
    .update({ ai_enabled: true })
    .eq("business_id", businessId)
    .in("channel", channels);
}

export async function syncChannelAiEnabledAfterAgentChange(
  businessId: string,
  channels: MessagingIntegrationChannelId[],
): Promise<void> {
  if (!hasSupabaseEnv() || channels.length === 0) {
    return;
  }

  const supabase = await createClient();

  const { data: enabledAgents } = await supabase
    .from("ai_agents")
    .select("channels")
    .eq("business_id", businessId)
    .eq("enabled", true);

  for (const channel of channels) {
    await ensureChannelAiSettings(supabase, businessId, channel);

    const hasEnabledAgent = (enabledAgents ?? []).some((agent) =>
      (agent.channels ?? []).includes(channel),
    );

    await supabase
      .from("ai_settings")
      .update({ ai_enabled: hasEnabledAgent })
      .eq("business_id", businessId)
      .eq("channel", channel);
  }
}

function revalidateChannelWorkspacePaths(channel: MessagingIntegrationChannelId): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(DASHBOARD_ROUTES.aiManager);
  revalidatePath(DASHBOARD_ROUTES.analytics);
  revalidatePath(DASHBOARD_ROUTES.onboarding);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/${channel}`);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(APP_ROUTES.dashboard);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function ensureChannelAiSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  channel: MessagingIntegrationChannelId,
) {
  const { data } = await supabase
    .from("ai_settings")
    .select("id")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  if (data) {
    return;
  }

  await supabase.from("ai_settings").insert({
    business_id: businessId,
    channel,
    provider: "gemini",
    model: getDefaultGeminiModel(),
    language: DEFAULT_AI_LANGUAGE,
    system_prompt: DEFAULT_AI_SYSTEM_PROMPT,
    ai_enabled: false,
  });
}

function resolveStoredProvider(value: string | null | undefined): AiProvider {
  if (value === "openai" || value === "claude" || value === "gemini") {
    return value;
  }

  return "gemini";
}

async function syncStoredModelIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  channel: MessagingIntegrationChannelId,
  storedModel: string | null | undefined,
): Promise<string> {
  const resolved = resolveGeminiModel(storedModel);

  if (storedModel && storedModel !== resolved) {
    await supabase
      .from("ai_settings")
      .update({ model: resolved })
      .eq("business_id", businessId)
      .eq("channel", channel);
  }

  return resolved;
}

export async function getChannelAiSettingsForBusiness(
  businessId: string,
  channel: MessagingIntegrationChannelId,
  isChannelConnected: boolean,
): Promise<ChannelAiSettingsData> {
  const defaultModel = getDefaultGeminiModel();

  const providerAvailability = getProviderAvailability();

  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: true,
      channel,
      aiEnabled: false,
      provider: "gemini",
      model: defaultModel,
      language: DEFAULT_AI_LANGUAGE,
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      isConfigured: false,
      geminiConfigured: hasGeminiEnv(),
      providerAvailability,
      isChannelConnected,
      defaultModel,
    };
  }

  const supabase = await createClient();
  await ensureChannelAiSettings(supabase, businessId, channel);

  const { data } = await supabase
    .from("ai_settings")
    .select("ai_enabled, provider, model, language, system_prompt")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  const provider = resolveStoredProvider(data?.provider);
  const geminiModel = await syncStoredModelIfNeeded(
    supabase,
    businessId,
    channel,
    provider === "gemini" ? data?.model : data?.model,
  );
  const model =
    provider === "gemini"
      ? geminiModel
      : resolveAiModel(provider, data?.model);

  return {
    hasBusiness: true,
    channel,
    aiEnabled: data?.ai_enabled ?? false,
    provider,
    model,
    language: data?.language ?? DEFAULT_AI_LANGUAGE,
    systemPrompt: data?.system_prompt ?? DEFAULT_AI_SYSTEM_PROMPT,
    isConfigured: Boolean(data),
    geminiConfigured: hasGeminiEnv(),
    providerAvailability,
    isChannelConnected,
    defaultModel,
  };
}

export async function syncChannelAnalytics(
  businessId: string,
  channel: MessagingIntegrationChannelId,
): Promise<{
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
}> {
  const admin = createAdminClient();

  const { count: totalContacts } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("channel", channel);

  const { data: conversations } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("channel", channel);

  const conversationIds = conversations?.map((row) => row.id) ?? [];

  let totalMessages = 0;
  let aiReplies = 0;

  if (conversationIds.length > 0) {
    const { count: messageCount } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds);

    const { count: aiCount } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .eq("ai_generated", true);

    totalMessages = messageCount ?? 0;
    aiReplies = aiCount ?? 0;
  }

  const payload = {
    business_id: businessId,
    channel,
    total_messages: totalMessages,
    total_contacts: totalContacts ?? 0,
    ai_replies: aiReplies,
    updated_at: new Date().toISOString(),
  };

  await admin.from("channel_analytics").upsert(payload, {
    onConflict: "business_id,channel",
  });

  return {
    totalMessages,
    totalContacts: totalContacts ?? 0,
    aiReplies,
  };
}

export async function getChannelConnectionStatuses(businessId: string) {
  const [whatsapp, telegram, websiteForms, websiteKnowledge, voice, googleCalendar, gmail] =
    await Promise.all([
      getWhatsAppConnection(businessId),
      getTelegramConnection(businessId),
      getWebsiteFormConnection(businessId),
      getWebsiteKnowledgeSync(businessId),
      getVoiceConnection(businessId),
      getGoogleCalendarConnection(businessId),
      getGmailConnection(businessId),
    ]);

  return buildIntegrationChannelStatuses({
    whatsappConnection: whatsapp,
    telegramConnection: telegram,
    websiteFormConnection: websiteForms,
    websiteKnowledgeSync: websiteKnowledge,
    voiceConnection: voice,
    googleCalendarConnection: googleCalendar,
    gmailConnection: gmail,
  });
}

export async function getChannelWorkspaceSummary(
  businessId: string,
  channel: MessagingIntegrationChannelId,
): Promise<ChannelWorkspaceSummary> {
  if (!hasSupabaseEnv()) {
    return { contactsCount: 0, aiEnabled: false, totalMessages: 0 };
  }

  const supabase = await createClient();

  const [contactsResult, aiResult, metrics] = await Promise.all([
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
    syncChannelAnalytics(businessId, channel),
  ]);

  return {
    contactsCount: contactsResult.count ?? 0,
    aiEnabled: aiResult.data?.ai_enabled ?? false,
    totalMessages: metrics.totalMessages,
  };
}

export async function getChannelContacts(
  channel: MessagingIntegrationChannelId,
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
  channel: MessagingIntegrationChannelId,
): Promise<ChannelAiSettingsData> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      channel,
      aiEnabled: false,
      provider: "gemini",
      model: getDefaultGeminiModel(),
      language: DEFAULT_AI_LANGUAGE,
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      isConfigured: false,
      geminiConfigured: hasGeminiEnv(),
      providerAvailability: getProviderAvailability(),
      isChannelConnected: false,
      defaultModel: getDefaultGeminiModel(),
    };
  }

  const statuses = await getChannelConnectionStatuses(businessId);

  return getChannelAiSettingsForBusiness(
    businessId,
    channel,
    isChannelConnectedForWorkspace(channel, statuses),
  );
}

export async function saveChannelAiSettings(
  input: SaveChannelAiSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveChannelAiSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  await ensureChannelAiSettings(supabase, businessId, parsed.data.channel);

  const provider = parsed.data.provider;
  const model =
    provider === "gemini"
      ? resolveGeminiModel(parsed.data.model)
      : resolveAiModel(provider, parsed.data.model);

  const { error } = await supabase
    .from("ai_settings")
    .update({
      ai_enabled: parsed.data.aiEnabled,
      provider,
      language: parsed.data.language,
      system_prompt: parsed.data.systemPrompt,
      model,
    })
    .eq("business_id", businessId)
    .eq("channel", parsed.data.channel);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateChannelWorkspacePaths(parsed.data.channel);

  return { success: true };
}

export async function testChannelAiReply(
  input: TestChannelAiReplyInput,
): Promise<
  | { success: true; reply: string; matchedAgentName: string | null }
  | { success: false; message: string }
> {
  const parsed = testChannelAiReplySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid test message.",
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();

  const reply = await generateFastAssistantReply({
    admin,
    businessId,
    channel: parsed.data.channel,
    clientMessage: parsed.data.testMessage,
    conversationHistory: [],
    requireAiEnabled: false,
  });

  if (!reply.success) {
    if (reply.reason === "settings_missing") {
      return {
        success: false,
        message: "Connect this channel in Integrations first.",
      };
    }

    return {
      success: false,
      message: reply.message ?? "Unable to generate test reply.",
    };
  }

  if (!isProviderConfigured(reply.provider)) {
    return {
      success: false,
      message: `${reply.provider} API is not configured for this environment.`,
    };
  }

  return {
    success: true,
    reply: reply.text,
    matchedAgentName: reply.matchedAgentName,
  };
}

export async function getChannelAnalytics(
  channel: MessagingIntegrationChannelId,
): Promise<ChannelAnalyticsData> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return emptyChannelAnalytics(channel);
  }

  const admin = createAdminClient();
  const metrics = await syncChannelAnalytics(businessId, channel);

  const { count: activeConversations } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("status", "active");

  const { data: conversations } = await admin
    .from("conversations")
    .select("id, contact:contacts(name)")
    .eq("business_id", businessId)
    .eq("channel", channel);

  const conversationIds = conversations?.map((row) => row.id) ?? [];
  const contactNameByConversation = new Map<string, string>();

  for (const row of conversations ?? []) {
    const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
    contactNameByConversation.set(
      row.id,
      contact?.name?.trim() || "Customer",
    );
  }

  let activity: ChannelAnalyticsData["activity"] = [];
  let recentMessages: ChannelAnalyticsData["recentMessages"] = [];

  if (conversationIds.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [{ data: activityRows }, { data: recentRows }] = await Promise.all([
      admin
        .from("messages")
        .select("created_at")
        .in("conversation_id", conversationIds)
        .gte("created_at", sevenDaysAgo.toISOString()),
      admin
        .from("messages")
        .select("id, conversation_id, sender_type, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    activity = buildLastSevenDaysActivity(
      activityRows?.map((message) => message.created_at) ?? [],
    );

    recentMessages =
      recentRows?.map((message) => ({
        id: message.id,
        preview: message.content.trim().slice(0, 120),
        senderType: message.sender_type,
        createdAt: message.created_at,
        contactName:
          contactNameByConversation.get(message.conversation_id) ?? "Customer",
      })) ?? [];
  } else {
    activity = buildLastSevenDaysActivity([]);
  }

  const manualReplies = Math.max(
    0,
    metrics.totalMessages - metrics.aiReplies,
  );

  return {
    hasBusiness: true,
    channel,
    totalMessages: metrics.totalMessages,
    totalContacts: metrics.totalContacts,
    aiReplies: metrics.aiReplies,
    manualReplies,
    activeConversations: activeConversations ?? 0,
    conversionRate: calculateConversionRate(
      metrics.aiReplies,
      metrics.totalMessages,
    ),
    activity,
    recentMessages,
  };
}

function emptyChannelAnalytics(
  channel: MessagingIntegrationChannelId,
): ChannelAnalyticsData {
  return {
    hasBusiness: false,
    channel,
    totalMessages: 0,
    totalContacts: 0,
    aiReplies: 0,
    manualReplies: 0,
    activeConversations: 0,
    conversionRate: 0,
    activity: buildLastSevenDaysActivity([]),
    recentMessages: [],
  };
}

export async function isChannelWorkspaceReady(
  businessId: string,
  channel: IntegrationChannelId,
): Promise<boolean> {
  const statuses = await getChannelConnectionStatuses(businessId);
  return isChannelConnectedForWorkspace(channel, statuses);
}

export async function setMessagingChannelsAiEnabled(
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();

  for (const channel of MESSAGING_INTEGRATION_CHANNELS) {
    await ensureChannelAiSettings(supabase, businessId, channel);
  }

  const { error } = await supabase
    .from("ai_settings")
    .update({ ai_enabled: enabled })
    .eq("business_id", businessId)
    .in("channel", [...MESSAGING_INTEGRATION_CHANNELS]);

  if (error) {
    return { success: false, message: error.message };
  }

  for (const channel of MESSAGING_INTEGRATION_CHANNELS) {
    revalidateChannelWorkspacePaths(channel);
  }

  return { success: true };
}

export async function updateChannelAiEnabled(
  channel: MessagingIntegrationChannelId,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  await ensureChannelAiSettings(supabase, businessId, channel);

  const { error } = await supabase
    .from("ai_settings")
    .update({ ai_enabled: enabled })
    .eq("business_id", businessId)
    .eq("channel", channel);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateChannelWorkspacePaths(channel);

  return { success: true };
}
