import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CHAT_MESSAGES,
  CONVERSATION_MESSAGES_PAGE_SIZE,
} from "@/features/chats/constants";
import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendInstagramChatMessage } from "@/services/instagram.service";
import { generateAssistantReply } from "@/services/llm.service";
import {
  createOutboundMessageDelivery,
  scheduleMessagingAnalyticsIncrement,
  insertChannelMessage,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
  listKnowledgeEntriesForBusiness,
} from "@/services/messaging.service";
import { sendTelegramChatMessage } from "@/services/telegram.service";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import type { MessagingChannel as DbMessagingChannel } from "@/types/database.types";
import {
  getActiveMessagingChannelIds,
  MESSAGING_INTEGRATION_CHANNELS,
} from "@/features/integrations";
import { isInboxMessagingChannel } from "@/features/integrations/constants";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import { listCannedResponses } from "@/services/canned-responses.service";
import { requireUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { resolveContactAvatarSignedUrls } from "@/services/contact-avatar-storage.service";
import { markConversationRead } from "@/services/conversation-read.service";
import { enrichChatMessages } from "@/services/message-enrichment.service";
import type {
  ChatMonitorChannelStats,
  ChatsChannelPageData,
  ChatsMonitorData,
  ChatsMonitorPageData,
  ChatsPageData,
  ConversationDetail,
  ConversationListItem,
  SendChatMessageResult,
  SuggestConversationReplyResult,
  ToggleChatAiResult,
} from "@/types/chat.types";
import {
  sendChatMessageSchema,
  suggestConversationReplySchema,
  toggleChatAiSchema,
  updateConversationInternalNoteSchema,
  updateConversationStatusSchema,
} from "@/types/chat.types";
import type {
  SuggestConversationReplyInput,
  UpdateConversationInternalNoteInput,
  UpdateConversationStatusInput,
} from "@/types/chat.types";
import {
  mapChatMessage,
  mapConversationListItem,
  resolveContactFromRow,
} from "@/utils/chat";
import { resolveAvatarUrlFromMap } from "@/utils/contact-avatar";
import { listConversationsPage } from "@/services/chat-inbox-query.service";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: CHAT_MESSAGES.missingConfig,
    },
  };
}

function revalidateChatPaths(channel?: DbMessagingChannel): void {
  revalidatePath(DASHBOARD_ROUTES.chats);

  if (
    channel &&
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel)
  ) {
    revalidatePath(`${DASHBOARD_ROUTES.chats}/${channel}`);
  }
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);
  return business?.id ?? null;
}


export async function listConversations(
  businessId: string,
  channel?: DbMessagingChannel,
): Promise<ConversationListItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select(
      "id, channel, status, updated_at, last_read_at, last_message_preview, last_message_at, last_message_sender_type, last_message_ai_generated, last_client_message_at, contact:contacts(id, name, phone_number, lead_score, is_favorite, avatar_url)",
    )
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data: conversations } = await query;

  if (!conversations?.length) {
    return [];
  }

  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls(
    conversations.map((conversation) => {
      const contact = resolveContactFromRow(conversation.contact);
      return contact?.avatar_url;
    }),
  );

  return conversations.flatMap((conversation) => {
    const contact = resolveContactFromRow(conversation.contact);
    const item = mapConversationListItem(
      conversation,
      undefined,
      undefined,
      0,
      resolveAvatarUrlFromMap(contact?.avatar_url, avatarSignedUrlMap),
    );

    return item ? [item] : [];
  });
}

export async function getConversationDetail(
  conversationId: string,
  businessId: string,
): Promise<ConversationDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, channel, status, internal_note, updated_at, last_read_at, contact:contacts(id, name, phone_number, is_favorite, avatar_url)",
    )
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return null;
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return null;
  }

  const { count: totalMessageCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false);

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at",
    )
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false)
    .order("created_at", { ascending: false })
    .limit(CONVERSATION_MESSAGES_PAGE_SIZE);

  const orderedMessages = (messages ?? []).slice().reverse();
  const totalCount = totalMessageCount ?? orderedMessages.length;

  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls([
    contact.avatar_url,
  ]);
  const contactAvatarUrl = resolveAvatarUrlFromMap(
    contact.avatar_url,
    avatarSignedUrlMap,
  );

  const enrichedMessages = await enrichChatMessages(
    supabase,
    orderedMessages.map(mapChatMessage),
  );

  return {
    id: conversation.id,
    contactId: contact.id ?? null,
    contactIsFavorite: contact.is_favorite ?? false,
    contactName: contact.name ?? contact.phone_number,
    contactPhone: contact.phone_number,
    contactAvatarUrl,
    channel: conversation.channel,
    status: conversation.status,
    internalNote: conversation.internal_note,
    updatedAt: conversation.updated_at,
    lastReadAt: conversation.last_read_at ?? null,
    messages: enrichedMessages,
    hasOlderMessages: totalCount > orderedMessages.length,
    totalMessageCount: totalCount,
  };
}

export async function getOlderConversationMessages(
  conversationId: string,
  businessId: string,
  beforeCreatedAt: string,
): Promise<{
  messages: ReturnType<typeof mapChatMessage>[];
  hasMore: boolean;
} | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return null;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at",
    )
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(CONVERSATION_MESSAGES_PAGE_SIZE);

  const orderedMessages = (messages ?? []).slice().reverse();

  return {
    messages: await enrichChatMessages(
      supabase,
      orderedMessages.map(mapChatMessage),
    ),
    hasMore: orderedMessages.length >= CONVERSATION_MESSAGES_PAGE_SIZE,
  };
}

async function deliverWhatsAppOutboundText(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  businessId: string;
  messageId: string;
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  content: string;
  channel: DbMessagingChannel;
}): Promise<void> {
  const sendResult = await sendWhatsAppTextMessage(
    input.phoneNumberId,
    input.accessToken,
    input.recipientPhone,
    input.content,
  );

  if (!sendResult.success) {
    await recordMessageDeliveryFailure(input.supabase, {
      messageId: input.messageId,
      errorMessage: sendResult.message,
    });
    return;
  }

  await recordMessageDeliverySuccess(input.supabase, {
    messageId: input.messageId,
    providerMessageId: sendResult.messageId,
  });

  scheduleMessagingAnalyticsIncrement(
    createAdminClient(),
    input.businessId,
    input.channel,
    {
      totalMessages: 1,
    },
  );
}

export async function getConversationMessagesTail(
  conversationId: string,
  businessId: string,
  limit = 20,
): Promise<ReturnType<typeof mapChatMessage>[] | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return null;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at",
    )
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  const orderedMessages = (messages ?? []).slice().reverse();

  return enrichChatMessages(supabase, orderedMessages.map(mapChatMessage));
}

export async function getNewConversationMessages(
  conversationId: string,
  businessId: string,
  afterCreatedAt: string,
  afterMessageId?: string,
): Promise<ReturnType<typeof mapChatMessage>[] | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return null;
  }

  let query = supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at",
    )
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false);

  if (afterMessageId) {
    query = query.or(
      `created_at.gt.${afterCreatedAt},and(created_at.eq.${afterCreatedAt},id.gt.${afterMessageId})`,
    );
  } else {
    query = query.gt("created_at", afterCreatedAt);
  }

  const { data: messages } = await query.order("created_at", { ascending: true });

  return enrichChatMessages(supabase, (messages ?? []).map(mapChatMessage));
}

async function isWhatsAppConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("whatsapp_status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.whatsapp_status === "connected";
}

async function isInstagramConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("instagram_connections")
    .select("instagram_status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.instagram_status === "connected";
}

async function isTelegramConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_connections")
    .select("telegram_status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.telegram_status === "connected";
}

async function isWebsiteFormsConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("website_form_connections")
    .select("connection_status")
    .eq("business_id", businessId)
    .maybeSingle();

  return data?.connection_status === "connected";
}

export async function isChatChannelConnected(
  businessId: string,
  channel: DbMessagingChannel,
): Promise<boolean> {
  if (channel === "whatsapp") {
    return isWhatsAppConnected(businessId);
  }

  if (channel === "instagram") {
    return isInstagramConnected(businessId);
  }

  if (channel === "telegram") {
    return isTelegramConnected(businessId);
  }

  return isWebsiteFormsConnected(businessId);
}

export type ActiveConversationContext = {
  conversation: ConversationDetail;
  channelConnected: boolean;
  aiEnabled: boolean | null;
  cannedResponses: Awaited<ReturnType<typeof listCannedResponses>>;
};

export async function getActiveConversationContext(
  conversationId: string,
  businessId: string,
): Promise<ActiveConversationContext | null> {
  const conversation = await getConversationDetail(conversationId, businessId);

  if (!conversation) {
    return null;
  }

  const user = await requireUser();

  const [channelConnected, aiEnabled, cannedResponses] = await Promise.all([
    isChatChannelConnected(businessId, conversation.channel),
    getAiEnabledForChannel(businessId, conversation.channel),
    listCannedResponses(
      isInboxMessagingChannel(conversation.channel)
        ? conversation.channel
        : undefined,
    ),
    markConversationRead(businessId, conversationId, user.id),
  ]);

  return {
    conversation,
    channelConnected,
    aiEnabled,
    cannedResponses,
  };
}

async function getAiEnabledForChannel(
  businessId: string,
  channel: DbMessagingChannel,
): Promise<boolean | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return data.ai_enabled;
}

export async function getChatsMonitorData(): Promise<ChatsMonitorData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      businessId: null,
      channels: [],
      visibleChannelIds: [],
      totalConversations: 0,
      totalMessages: 0,
      unifiedConversations: [],
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      hasBusiness: false,
      businessId: null,
      channels: [],
      visibleChannelIds: [],
      totalConversations: 0,
      totalMessages: 0,
      unifiedConversations: [],
    };
  }

  const supabase = await createClient();
  const channelStatuses = await getChannelConnectionStatuses(business.id);
  const visibleChannelIds = getActiveMessagingChannelIds(channelStatuses);
  const channels: ChatMonitorChannelStats[] = [];

  for (const channel of visibleChannelIds) {
    const [connected, analyticsResult, conversationsResult, lastConversation] =
      await Promise.all([
        isChatChannelConnected(business.id, channel),
        supabase
          .from("channel_analytics")
          .select("total_messages, ai_replies")
          .eq("business_id", business.id)
          .eq("channel", channel)
          .maybeSingle(),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("channel", channel),
        supabase
          .from("conversations")
          .select("updated_at")
          .eq("business_id", business.id)
          .eq("channel", channel)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    channels.push({
      channel,
      connected,
      conversationsCount: conversationsResult.count ?? 0,
      totalMessages: analyticsResult.data?.total_messages ?? 0,
      aiReplies: analyticsResult.data?.ai_replies ?? 0,
      lastActivityAt: lastConversation.data?.updated_at ?? null,
    });
  }

  const totalConversations = channels.reduce(
    (sum, item) => sum + item.conversationsCount,
    0,
  );
  const totalMessages = channels.reduce(
    (sum, item) => sum + item.totalMessages,
    0,
  );

  return {
    hasBusiness: true,
    businessId: business.id,
    channels,
    visibleChannelIds,
    totalConversations,
    totalMessages,
    unifiedConversations: [],
  };
}

export async function getChatsMonitorPageData(): Promise<ChatsMonitorPageData> {
  const monitor = await getChatsMonitorData();

  if (!monitor.hasBusiness) {
    return {
      ...monitor,
      conversations: [],
      conversationsTotalCount: 0,
      conversationsHasMore: false,
      needsAttentionConversations: [],
      activeConversation: null,
      activeChannelConnected: false,
      activeAiEnabled: null,
      activeCannedResponses: [],
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      ...monitor,
      conversations: [],
      conversationsTotalCount: 0,
      conversationsHasMore: false,
      needsAttentionConversations: [],
      activeConversation: null,
      activeChannelConnected: false,
      activeAiEnabled: null,
      activeCannedResponses: [],
    };
  }

  const [page, needsAttentionPage] = await Promise.all([
    listConversationsPage(business.id, { limit: 50, offset: 0 }),
    listConversationsPage(business.id, {
      view: "needs_reply",
      limit: 8,
      offset: 0,
    }),
  ]);

  return {
    ...monitor,
    conversations: page.items,
    conversationsTotalCount: page.totalCount,
    conversationsHasMore: page.hasMore,
    needsAttentionConversations: needsAttentionPage.items,
    activeConversation: null,
    activeChannelConnected: false,
    activeAiEnabled: null,
    activeCannedResponses: [],
  };
}

export async function updateConversationStatus(
  input: UpdateConversationStatusInput,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: CHAT_MESSAGES.missingConfig };
  }

  const parsed = updateConversationStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: CHAT_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.conversationId)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: CHAT_MESSAGES.genericError };
  }

  revalidateChatPaths();
  return { success: true };
}

export async function updateConversationInternalNote(
  input: UpdateConversationInternalNoteInput,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: CHAT_MESSAGES.missingConfig };
  }

  const parsed = updateConversationInternalNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: CHAT_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const trimmedNote = parsed.data.internalNote.trim();
  const { error } = await supabase
    .from("conversations")
    .update({ internal_note: trimmedNote.length > 0 ? trimmedNote : null })
    .eq("id", parsed.data.conversationId)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: CHAT_MESSAGES.genericError };
  }

  revalidateChatPaths();
  return { success: true };
}

export async function getChatsChannelPageData(
  channel: DbMessagingChannel,
): Promise<ChatsChannelPageData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      businessId: null,
      channel,
      channelConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
      cannedResponses: [],
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      hasBusiness: false,
      businessId: null,
      channel,
      channelConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
      cannedResponses: [],
    };
  }

  const [conversationsPage, channelConnected, cannedResponses] = await Promise.all([
    listConversationsPage(business.id, { channel, limit: 100, offset: 0 }),
    isChatChannelConnected(business.id, channel),
    listCannedResponses(
      isInboxMessagingChannel(channel) ? channel : undefined,
    ),
  ]);

  const aiEnabled = await getAiEnabledForChannel(business.id, channel);

  return {
    hasBusiness: true,
    businessId: business.id,
    channel,
    channelConnected,
    aiEnabled,
    conversations: conversationsPage.items,
    activeConversation: null,
    cannedResponses,
  };
}

export async function getChatsFavoritesPageData(): Promise<ChatsMonitorPageData> {
  const monitor = await getChatsMonitorData();

  if (!monitor.hasBusiness) {
    return {
      ...monitor,
      conversations: [],
      conversationsTotalCount: 0,
      conversationsHasMore: false,
      needsAttentionConversations: [],
      activeConversation: null,
      activeChannelConnected: false,
      activeAiEnabled: null,
      activeCannedResponses: [],
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      ...monitor,
      conversations: [],
      conversationsTotalCount: 0,
      conversationsHasMore: false,
      needsAttentionConversations: [],
      activeConversation: null,
      activeChannelConnected: false,
      activeAiEnabled: null,
      activeCannedResponses: [],
    };
  }

  const page = await listConversationsPage(business.id, {
    view: "favorites",
    limit: 50,
    offset: 0,
  });

  return {
    ...monitor,
    conversations: page.items,
    conversationsTotalCount: page.totalCount,
    conversationsHasMore: page.hasMore,
    needsAttentionConversations: [],
    activeConversation: null,
    activeChannelConnected: false,
    activeAiEnabled: null,
    activeCannedResponses: [],
  };
}

export async function resolveInboxActiveConversationContext(
  conversationId: string | undefined,
): Promise<{
  activeConversation: ConversationDetail | null;
  activeChannelConnected: boolean;
  activeAiEnabled: boolean | null;
  activeCannedResponses: Awaited<ReturnType<typeof listCannedResponses>>;
}> {
  const empty = {
    activeConversation: null,
    activeChannelConnected: false,
    activeAiEnabled: null,
    activeCannedResponses: [] as Awaited<ReturnType<typeof listCannedResponses>>,
  };

  if (!conversationId || !hasSupabaseEnv()) {
    return empty;
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return empty;
  }

  const context = await getActiveConversationContext(conversationId, business.id);

  if (!context) {
    return empty;
  }

  return {
    activeConversation: context.conversation,
    activeChannelConnected: context.channelConnected,
    activeAiEnabled: context.aiEnabled,
    activeCannedResponses: context.cannedResponses,
  };
}

export async function getChatsPageData(
  activeConversationId?: string,
): Promise<ChatsPageData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      whatsappConnected: false,
      instagramConnected: false,
      telegramConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
    };
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return {
      hasBusiness: false,
      whatsappConnected: false,
      instagramConnected: false,
      telegramConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
    };
  }

  const [conversations, whatsappConnected, instagramConnected, telegramConnected] =
    await Promise.all([
      listConversations(business.id),
      isWhatsAppConnected(business.id),
      isInstagramConnected(business.id),
      isTelegramConnected(business.id),
    ]);

  const selectedId =
    activeConversationId &&
    conversations.some((conversation) => conversation.id === activeConversationId)
      ? activeConversationId
      : (conversations[0]?.id ?? null);

  const activeConversation = selectedId
    ? await getConversationDetail(selectedId, business.id)
    : null;

  const aiEnabled = activeConversation
    ? await getAiEnabledForChannel(business.id, activeConversation.channel)
    : null;

  return {
    hasBusiness: true,
    whatsappConnected,
    instagramConnected,
    telegramConnected,
    aiEnabled,
    conversations,
    activeConversation,
  };
}

export async function sendChatMessage(
  input: unknown,
): Promise<SendChatMessageResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = sendChatMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, channel, contact:contacts(id, phone_number)")
    .eq("id", parsed.data.conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  if (conversation.channel === "instagram") {
    const sendResult = await sendInstagramChatMessage(
      businessId,
      parsed.data.conversationId,
      parsed.data.content,
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: {
          code: "SEND_FAILED",
          message: sendResult.message,
        },
      };
    }

    return {
      success: true,
      data: {
        message: mapChatMessage(sendResult.message),
      },
    };
  } else if (conversation.channel === "telegram") {
    const sendResult = await sendTelegramChatMessage(
      businessId,
      parsed.data.conversationId,
      parsed.data.content,
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: {
          code: "SEND_FAILED",
          message: sendResult.message,
        },
      };
    }

    return {
      success: true,
      data: {
        message: mapChatMessage(sendResult.message),
      },
    };
  } else if (conversation.channel === "website_forms") {
    const connected = await isWebsiteFormsConnected(businessId);

    if (!connected) {
      return {
        success: false,
        error: {
          code: "WHATSAPP_NOT_CONNECTED",
          message: CHAT_MESSAGES.websiteFormsNotConnected,
        },
      };
    }
  } else {
    const connected = await isWhatsAppConnected(businessId);

    if (!connected) {
      return {
        success: false,
        error: {
          code: "WHATSAPP_NOT_CONNECTED",
          message: CHAT_MESSAGES.whatsappNotConnected,
        },
      };
    }

    const contact = resolveContactFromRow(conversation.contact);

    if (!contact) {
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: CHAT_MESSAGES.genericError,
        },
      };
    }

    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (
      !connection?.meta_phone_number_id ||
      !connection.meta_access_token
    ) {
      return {
        success: false,
        error: {
          code: "WHATSAPP_NOT_CONNECTED",
          message: CHAT_MESSAGES.whatsappNotConnected,
        },
      };
    }

    const insertedMessage = await insertChannelMessage(supabase, {
      conversationId: parsed.data.conversationId,
      channel: conversation.channel,
      senderType: "user",
      content: parsed.data.content,
    });

    await createOutboundMessageDelivery(supabase, {
      messageId: insertedMessage.id,
      businessId,
      channel: conversation.channel,
    });

    const now = new Date().toISOString();
    const contactUpdates = contact.id
      ? [
          supabase
            .from("contacts")
            .update({ last_message_at: now })
            .eq("id", contact.id),
        ]
      : [];

    await Promise.all([
      supabase
        .from("conversations")
        .update({ updated_at: now })
        .eq("id", parsed.data.conversationId),
      ...contactUpdates,
    ]);

    void deliverWhatsAppOutboundText({
      supabase,
      businessId,
      messageId: insertedMessage.id,
      phoneNumberId: connection.meta_phone_number_id,
      accessToken: connection.meta_access_token,
      recipientPhone: contact.phone_number.replace(/^\+/, ""),
      content: parsed.data.content,
      channel: conversation.channel,
    }).catch((error) => {
      console.error("[whatsapp] outbound delivery failed", error);
    });

    return {
      success: true,
      data: {
        message: mapChatMessage(insertedMessage),
      },
    };
  }

  const contact = resolveContactFromRow(conversation.contact);

  const now = new Date().toISOString();

  await insertChannelMessage(supabase, {
    conversationId: parsed.data.conversationId,
    channel: conversation.channel,
    senderType: "user",
    content: parsed.data.content,
  });

  const { data: insertedMessage } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at",
    )
    .eq("conversation_id", parsed.data.conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!insertedMessage) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.sendFailed,
      },
    };
  }

  const contactUpdates = contact?.id
    ? [
        supabase
          .from("contacts")
          .update({ last_message_at: now })
          .eq("id", contact.id),
      ]
    : [];

  await Promise.all([
    supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", parsed.data.conversationId),
    ...contactUpdates,
  ]);

  scheduleMessagingAnalyticsIncrement(
    createAdminClient(),
    businessId,
    conversation.channel,
    {
      totalMessages: 1,
    },
  );

  return {
    success: true,
    data: {
      message: mapChatMessage(insertedMessage),
    },
  };
}

export async function toggleChatAi(input: unknown): Promise<ToggleChatAiResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = toggleChatAiSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_settings")
    .update({ ai_enabled: parsed.data.enabled })
    .eq("business_id", businessId)
    .eq("channel", parsed.data.channel);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CHAT_MESSAGES.aiToggleFailed,
      },
    };
  }

  revalidateChatPaths(parsed.data.channel);

  return {
    success: true,
    data: {
      aiEnabled: parsed.data.enabled,
    },
  };
}

export async function suggestConversationReply(
  input: SuggestConversationReplyInput,
): Promise<SuggestConversationReplyResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  if (!hasGeminiEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CHAT_MESSAGES.suggestReplyFailed,
      },
    };
  }

  const parsed = suggestConversationReplySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const conversation = await getConversationDetail(
    parsed.data.conversationId,
    businessId,
  );

  if (!conversation) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const lastClientMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.senderType === "client");

  if (!lastClientMessage) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.suggestReplyNoMessages,
      },
    };
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("provider, model, language, system_prompt")
    .eq("business_id", businessId)
    .eq("channel", conversation.channel)
    .maybeSingle();

  if (!settings) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CHAT_MESSAGES.suggestReplyFailed,
      },
    };
  }

  const admin = createAdminClient();
  const knowledgeEntries = await listKnowledgeEntriesForBusiness(
    admin,
    businessId,
  );

  const reply = await generateAssistantReply({
    businessId,
    conversationId: parsed.data.conversationId,
    provider:
      settings.provider === "openai" || settings.provider === "claude"
        ? settings.provider
        : "gemini",
    model: settings.model,
    systemPrompt: settings.system_prompt,
    language: settings.language,
    userMessage: lastClientMessage.content,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
    })),
    conversationHistory: conversation.messages.map((message) => ({
      role: message.senderType === "client" ? "user" : "assistant",
      content: message.content,
    })),
  });

  if (!reply.success) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: reply.error.message || CHAT_MESSAGES.suggestReplyFailed,
      },
    };
  }

  return {
    success: true,
    data: {
      suggestion: reply.data.text,
    },
  };
}
