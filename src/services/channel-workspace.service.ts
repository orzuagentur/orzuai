import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import type { IntegrationChannelId } from "@/features/integrations";
import {
  buildIntegrationChannelStatuses,
  isChannelConnectedForWorkspace,
} from "@/features/integrations/channel-status";
import { getDefaultGeminiModel, hasGeminiEnv } from "@/lib/env";
import { resolveGeminiModel } from "@/lib/gemini/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateAssistantReply } from "@/services/gemini.service";
import { getInstagramConnection } from "@/services/instagram.service";
import { listKnowledgeEntriesForBusiness } from "@/services/messaging.service";
import { getTelegramConnection } from "@/services/telegram.service";
import { getWebsiteFormConnection } from "@/services/website-forms.service";
import { getWhatsAppConnection } from "@/services/whatsapp.service";
import type {
  ChannelAiSettingsData,
  ChannelAnalyticsData,
  ChannelContactsData,
  ChannelWorkspaceSummary,
  MessagingChannel,
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

function revalidateChannelWorkspacePaths(channel: MessagingChannel): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(DASHBOARD_ROUTES.analytics);
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
  channel: MessagingChannel,
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
    model: getDefaultGeminiModel(),
    language: DEFAULT_AI_LANGUAGE,
    system_prompt: DEFAULT_AI_SYSTEM_PROMPT,
    ai_enabled: false,
  });
}

async function syncStoredModelIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  channel: MessagingChannel,
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
  channel: MessagingChannel,
  isChannelConnected: boolean,
): Promise<ChannelAiSettingsData> {
  const defaultModel = getDefaultGeminiModel();

  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: true,
      channel,
      aiEnabled: false,
      model: defaultModel,
      language: DEFAULT_AI_LANGUAGE,
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      isConfigured: false,
      geminiConfigured: hasGeminiEnv(),
      isChannelConnected,
      defaultModel,
    };
  }

  const supabase = await createClient();
  await ensureChannelAiSettings(supabase, businessId, channel);

  const { data } = await supabase
    .from("ai_settings")
    .select("ai_enabled, model, language, system_prompt")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  const model = await syncStoredModelIfNeeded(
    supabase,
    businessId,
    channel,
    data?.model,
  );

  return {
    hasBusiness: true,
    channel,
    aiEnabled: data?.ai_enabled ?? false,
    model,
    language: data?.language ?? DEFAULT_AI_LANGUAGE,
    systemPrompt: data?.system_prompt ?? DEFAULT_AI_SYSTEM_PROMPT,
    isConfigured: Boolean(data),
    geminiConfigured: hasGeminiEnv(),
    isChannelConnected,
    defaultModel,
  };
}

export async function syncChannelAnalytics(
  businessId: string,
  channel: MessagingChannel,
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
  const [whatsapp, instagram, telegram, websiteForms] = await Promise.all([
    getWhatsAppConnection(businessId),
    getInstagramConnection(businessId),
    getTelegramConnection(businessId),
    getWebsiteFormConnection(businessId),
  ]);

  return buildIntegrationChannelStatuses({
    whatsappConnection: whatsapp,
    instagramConnection: instagram,
    telegramConnection: telegram,
    websiteFormConnection: websiteForms,
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
      systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      isConfigured: false,
      geminiConfigured: hasGeminiEnv(),
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

  const { error } = await supabase
    .from("ai_settings")
    .update({
      ai_enabled: parsed.data.aiEnabled,
      language: parsed.data.language,
      system_prompt: parsed.data.systemPrompt,
      model: resolveGeminiModel(parsed.data.model),
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
): Promise<{ success: true; reply: string } | { success: false; message: string }> {
  const parsed = testChannelAiReplySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid test message.",
    };
  }

  if (!hasGeminiEnv()) {
    return {
      success: false,
      message: "Gemini API is not configured. Add GEMINI_API_KEY to your environment.",
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("model, language, system_prompt")
    .eq("business_id", businessId)
    .eq("channel", parsed.data.channel)
    .maybeSingle();

  if (!settings) {
    return { success: false, message: "Save AI settings for this channel first." };
  }

  const admin = createAdminClient();
  const knowledgeEntries = await listKnowledgeEntriesForBusiness(admin, businessId);

  const reply = await generateAssistantReply({
    model: settings.model,
    systemPrompt: settings.system_prompt,
    language: settings.language,
    userMessage: parsed.data.testMessage,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
    })),
    conversationHistory: [],
  });

  if (!reply.success) {
    return { success: false, message: reply.error.message };
  }

  return { success: true, reply: reply.data.text };
}

export async function getChannelAnalytics(
  channel: MessagingChannel,
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
    const { data: messageRows } = await admin
      .from("messages")
      .select(
        "id, conversation_id, sender_type, content, created_at",
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(80);

    const timestamps =
      messageRows?.map((message) => message.created_at) ?? [];
    activity = buildLastSevenDaysActivity(timestamps);

    recentMessages =
      messageRows?.slice(0, 8).map((message) => ({
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
  channel: MessagingChannel,
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

export async function updateChannelAiEnabled(
  channel: MessagingChannel,
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
