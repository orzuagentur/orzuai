import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CHAT_MESSAGES,
  CONVERSATION_MESSAGES_PAGE_SIZE,
} from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateFastAssistantReply } from "@/services/auto-reply-pipeline.service";
import {
  createOutboundMessageDelivery,
  insertChannelMessage,
  scheduleMessagingAnalyticsIncrement,
} from "@/services/messaging.service";
import { scheduleOutboundMessageDelivery } from "@/services/message-delivery.service";
import { buildPendingOutboundChatMessage } from "@/services/outbound-message.service";
import { sendTelegramChatMessage } from "@/services/telegram.service";
import type { MessagingChannel as DbMessagingChannel } from "@/types/database.types";
import {
  getActiveInboxChannelIds,
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
  ConversationDetail,
  SendChatMessageResult,
  SuggestConversationReplyResult,
} from "@/types/chat.types";
import {
  sendChatMessageSchema,
  suggestConversationReplySchema,
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
  resolveContactFromRow,
} from "@/utils/chat";
import { resolveAvatarUrlFromMap } from "@/utils/contact-avatar";
import { listConversationsMonitorPage, listConversationsPage } from "@/services/chat-inbox-query.service";
import { isSmsInboxVisible, isVoiceInboxVisible } from "@/services/voice-inbox.service";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageRepository } from "@/repositories/message.repository";

export type InboxBusinessContext = {
  userId: string;
  businessId: string;
};

export async function resolveInboxBusinessContext(): Promise<InboxBusinessContext | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return null;
  }

  return {
    userId: user.id,
    businessId: business.id,
  };
}

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
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(DASHBOARD_ROUTES.aiManager);
  revalidatePath(DASHBOARD_ROUTES.integrations);

  if (
    channel &&
    (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel)
  ) {
    revalidatePath(`${DASHBOARD_ROUTES.chats}/${channel}`);
    revalidatePath(`${DASHBOARD_ROUTES.integrations}/${channel}`);
  }
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);
  return business?.id ?? null;
}


export async function getConversationDetail(
  conversationId: string,
  businessId: string,
): Promise<ConversationDetail | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const conversationRepo = getConversationRepository(supabase);
  const messageRepo = getMessageRepository(supabase);
  const conversation = await conversationRepo.findOwnedInboxDetail(
    conversationId,
    businessId,
  );

  if (!conversation) {
    return null;
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return null;
  }

  const messages = await messageRepo.listChatMessages({
    conversationId,
    limit: CONVERSATION_MESSAGES_PAGE_SIZE,
    order: "desc",
  });
  const orderedMessages = messages.slice().reverse();
  const totalCount =
    conversation.total_message_count ?? orderedMessages.length;

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
  beforeSentAt: string,
): Promise<{
  messages: ReturnType<typeof mapChatMessage>[];
  hasMore: boolean;
} | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const conversationRepo = getConversationRepository(supabase);
  const messageRepo = getMessageRepository(supabase);
  const conversation = await conversationRepo.assertOwnedByBusiness(
    conversationId,
    businessId,
  );

  if (!conversation) {
    return null;
  }

  const messages = await messageRepo.listChatMessages({
    conversationId,
    limit: CONVERSATION_MESSAGES_PAGE_SIZE,
    beforeSentAt,
    order: "desc",
  });

  const orderedMessages = messages.slice().reverse();

  return {
    messages: await enrichChatMessages(
      supabase,
      orderedMessages.map(mapChatMessage),
    ),
    hasMore: orderedMessages.length >= CONVERSATION_MESSAGES_PAGE_SIZE,
  };
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
  const conversationRepo = getConversationRepository(supabase);
  const messageRepo = getMessageRepository(supabase);
  const conversation = await conversationRepo.assertOwnedByBusiness(
    conversationId,
    businessId,
  );

  if (!conversation) {
    return null;
  }

  const messages = await messageRepo.listChatMessages({
    conversationId,
    limit,
    order: "desc",
  });

  const orderedMessages = messages.slice().reverse();

  return enrichChatMessages(supabase, orderedMessages.map(mapChatMessage));
}

export async function getNewConversationMessages(
  conversationId: string,
  businessId: string,
  afterSentAt: string,
  afterMessageId?: string,
): Promise<ReturnType<typeof mapChatMessage>[] | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const conversationRepo = getConversationRepository(supabase);
  const messageRepo = getMessageRepository(supabase);
  const conversation = await conversationRepo.assertOwnedByBusiness(
    conversationId,
    businessId,
  );

  if (!conversation) {
    return null;
  }

  const messages = await messageRepo.listChatMessages({
    conversationId,
    afterSentAt,
    afterMessageId,
    order: "asc",
  });

  return enrichChatMessages(supabase, messages.map(mapChatMessage));
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

async function isWhatsAppWebConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_web_connections")
    .select("status")
    .eq("business_id", businessId)
    .maybeSingle();

  return data?.status === "connected";
}

async function isInstagramConnected(_businessId: string): Promise<boolean> {
  return false;
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

async function isTelegramUserConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_user_connections")
    .select("status")
    .eq("business_id", businessId)
    .maybeSingle();

  return data?.status === "connected";
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

  if (channel === "whatsapp_web") {
    return isWhatsAppWebConnected(businessId);
  }

  if (channel === "instagram") {
    return isInstagramConnected(businessId);
  }

  if (channel === "telegram") {
    return isTelegramConnected(businessId);
  }

  if (channel === "telegram_user") {
    return isTelegramUserConnected(businessId);
  }

  if (channel === "email") {
    const { isGmailConnected } = await import(
      "@/services/gmail-integration.service"
    );
    return isGmailConnected(businessId);
  }

  if (channel === "outlook") {
    const { isOutlookConnected } = await import(
      "@/services/outlook-integration.service"
    );
    return isOutlookConnected(businessId);
  }

  if (channel === "website_forms" || channel === "website_chat") {
    return isWebsiteFormsConnected(businessId);
  }

  return false;
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

  const readAt = new Date().toISOString();

  return {
    conversation: {
      ...conversation,
      lastReadAt: readAt,
    },
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

export async function getChatsMonitorData(
  businessId?: string,
): Promise<ChatsMonitorData> {
  if (!hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      businessId: null,
      channels: [],
      visibleChannelIds: [],
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
      totalConversations: 0,
      totalMessages: 0,
      unifiedConversations: [],
    };
  }

  let resolvedBusinessId = businessId;

  if (!resolvedBusinessId) {
    const user = await requireUser();
    const business = await getAccessibleBusiness(user.id);
    resolvedBusinessId = business?.id;
  }

  if (!resolvedBusinessId) {
    return {
      hasBusiness: false,
      businessId: null,
      channels: [],
      visibleChannelIds: [],
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
      totalConversations: 0,
      totalMessages: 0,
      unifiedConversations: [],
    };
  }

  const supabase = await createClient();
  const [channelStatuses, voiceInboxEnabled, smsInboxEnabled] = await Promise.all([
    getChannelConnectionStatuses(resolvedBusinessId),
    isVoiceInboxVisible(resolvedBusinessId),
    isSmsInboxVisible(resolvedBusinessId),
  ]);
  const visibleChannelIds = getActiveInboxChannelIds(channelStatuses);
  const channels: ChatMonitorChannelStats[] = [];

  for (const channel of visibleChannelIds) {
    const conversationRepo = getConversationRepository(supabase);
    const [connected, analyticsResult, conversationsCount, lastActivityAt] =
      await Promise.all([
        isChatChannelConnected(resolvedBusinessId, channel),
        supabase
          .from("channel_analytics")
          .select("total_messages, ai_replies")
          .eq("business_id", resolvedBusinessId)
          .eq("channel", channel)
          .maybeSingle(),
        conversationRepo.countByBusinessAndChannel(resolvedBusinessId, channel),
        conversationRepo.findLatestUpdatedAt(resolvedBusinessId, channel),
      ]);

    channels.push({
      channel,
      connected,
      conversationsCount,
      totalMessages: analyticsResult.data?.total_messages ?? 0,
      aiReplies: analyticsResult.data?.ai_replies ?? 0,
      lastActivityAt,
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
    businessId: resolvedBusinessId,
    channels,
    visibleChannelIds,
    voiceInboxEnabled,
    smsInboxEnabled,
    totalConversations,
    totalMessages,
    unifiedConversations: [],
  };
}

export async function getChatsMonitorPageData(
  inboxContext?: InboxBusinessContext | null,
): Promise<ChatsMonitorPageData> {
  const ctx = inboxContext ?? (await resolveInboxBusinessContext());

  if (!ctx) {
    const monitor = await getChatsMonitorData();
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

  const [monitor, page] = await Promise.all([
    getChatsMonitorData(ctx.businessId),
    listConversationsMonitorPage(ctx.businessId, {
      userId: ctx.userId,
      limit: 50,
      offset: 0,
      includeNeedsAttention: true,
    }),
  ]);

  return {
    ...monitor,
    conversations: page.items,
    conversationsTotalCount: page.totalCount,
    conversationsHasMore: page.hasMore,
    needsAttentionConversations: page.needsAttentionConversations,
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
  const conversationRepo = getConversationRepository(supabase);

  try {
    await conversationRepo.updateStatus(
      parsed.data.conversationId,
      businessId,
      parsed.data.status,
    );
  } catch {
    return { success: false, message: CHAT_MESSAGES.genericError };
  }

  if (
    parsed.data.status === "resolved" ||
    parsed.data.status === "closed"
  ) {
    const { resumeConversationAutoReply } = await import(
      "@/services/conversation-auto-reply.service"
    );
    await resumeConversationAutoReply(supabase, {
      businessId,
      conversationId: parsed.data.conversationId,
    });

    const { enqueueCrmOrchestrationOnResolve } = await import(
      "@/services/ai-orchestration-queue.service"
    );
    void enqueueCrmOrchestrationOnResolve({
      businessId,
      conversationId: parsed.data.conversationId,
    }).catch((error) => {
      console.warn(
        "[chat] on_resolve CRM orchestration enqueue failed",
        error instanceof Error ? error.message : "unknown",
      );
    });
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
  const conversationRepo = getConversationRepository(supabase);
  const trimmedNote = parsed.data.internalNote.trim();

  try {
    await conversationRepo.setInternalNote(
      parsed.data.conversationId,
      businessId,
      trimmedNote.length > 0 ? trimmedNote : null,
    );
  } catch {
    return { success: false, message: CHAT_MESSAGES.genericError };
  }

  revalidateChatPaths();
  return { success: true };
}

export async function getChatsChannelPageData(
  channel: DbMessagingChannel,
  inboxContext?: InboxBusinessContext | null,
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
      visibleChannelIds: [],
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
    };
  }

  const ctx = inboxContext ?? (await resolveInboxBusinessContext());

  if (!ctx) {
    return {
      hasBusiness: false,
      businessId: null,
      channel,
      channelConnected: false,
      aiEnabled: null,
      conversations: [],
      activeConversation: null,
      cannedResponses: [],
      visibleChannelIds: [],
      voiceInboxEnabled: false,
      smsInboxEnabled: false,
    };
  }

  const [channelStatuses, voiceInboxEnabled, smsInboxEnabled] = await Promise.all([
    getChannelConnectionStatuses(ctx.businessId),
    isVoiceInboxVisible(ctx.businessId),
    isSmsInboxVisible(ctx.businessId),
  ]);
  const visibleChannelIds = getActiveInboxChannelIds(channelStatuses);

  const [conversationsPage, channelConnected, cannedResponses, aiEnabled] =
    await Promise.all([
      listConversationsPage(ctx.businessId, {
        userId: ctx.userId,
        channel,
        limit: 100,
        offset: 0,
      }),
      isChatChannelConnected(ctx.businessId, channel),
      listCannedResponses(
        isInboxMessagingChannel(channel) ? channel : undefined,
      ),
      getAiEnabledForChannel(ctx.businessId, channel),
    ]);

  return {
    hasBusiness: true,
    businessId: ctx.businessId,
    channel,
    channelConnected,
    aiEnabled,
    conversations: conversationsPage.items,
    activeConversation: null,
    cannedResponses,
    visibleChannelIds,
    voiceInboxEnabled,
    smsInboxEnabled,
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
  inboxContext?: InboxBusinessContext | null,
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

  const ctx = inboxContext ?? (await resolveInboxBusinessContext());

  if (!ctx) {
    return empty;
  }

  const context = await getActiveConversationContext(
    conversationId,
    ctx.businessId,
  );

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
  const conversationRepo = getConversationRepository(supabase);
  const messageRepo = getMessageRepository(supabase);
  const conversation = await conversationRepo.findOwnedForOutbound(
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

  if (conversation.channel === "instagram") {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.instagramNotConnected,
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
        message: buildPendingOutboundChatMessage(sendResult.message),
      },
    };
  } else if (
    conversation.channel === "whatsapp" ||
    conversation.channel === "whatsapp_web" ||
    conversation.channel === "telegram_user"
  ) {
    const connected = await isChatChannelConnected(
      businessId,
      conversation.channel,
    );

    if (!connected) {
      return {
        success: false,
        error: {
          code: "WHATSAPP_NOT_CONNECTED",
          message:
            conversation.channel === "telegram_user"
              ? CHAT_MESSAGES.telegramNotConnected
              : CHAT_MESSAGES.whatsappNotConnected,
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
      conversationRepo.touchUpdatedAt(parsed.data.conversationId, now),
      ...contactUpdates,
    ]);

    scheduleOutboundMessageDelivery(insertedMessage.id);

    return {
      success: true,
      data: {
        message: buildPendingOutboundChatMessage(insertedMessage),
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
  } else if (
    conversation.channel === "email" ||
    conversation.channel === "outlook"
  ) {
    const mailboxConnected = await isChatChannelConnected(
      businessId,
      conversation.channel,
    );

    if (!mailboxConnected) {
      return {
        success: false,
        error: {
          code: "WHATSAPP_NOT_CONNECTED",
          message:
            conversation.channel === "outlook"
              ? CHAT_MESSAGES.outlookNotConnected
              : CHAT_MESSAGES.emailNotConnected,
        },
      };
    }

    const emailSubject = parsed.data.emailSubject?.trim();

    if (!emailSubject) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `${CHAT_MESSAGES.emailSubjectLabel} is required.`,
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

    const insertedMessage = await insertChannelMessage(supabase, {
      conversationId: parsed.data.conversationId,
      channel: conversation.channel,
      senderType: "user",
      content: parsed.data.content,
      emailSubject,
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
      conversationRepo.touchUpdatedAt(parsed.data.conversationId, now),
      ...contactUpdates,
    ]);

    scheduleOutboundMessageDelivery(insertedMessage.id);

    return {
      success: true,
      data: {
        message: buildPendingOutboundChatMessage(insertedMessage),
      },
    };
  } else {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.genericError,
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

  const insertedMessage = await messageRepo.findLatestChatMessage(
    parsed.data.conversationId,
  );

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
    conversationRepo.touchUpdatedAt(parsed.data.conversationId, now),
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

export async function suggestConversationReply(
  input: SuggestConversationReplyInput,
): Promise<SuggestConversationReplyResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
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

  const admin = createAdminClient();
  const reply = await generateFastAssistantReply({
    admin,
    businessId,
    channel: conversation.channel,
    conversationId: parsed.data.conversationId,
    clientMessage: lastClientMessage.content,
    conversationHistory: conversation.messages.map((message) => ({
      role: message.senderType === "client" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })),
    requireAiEnabled: false,
    skipWorkerActions: true,
  });

  if (!reply.success) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: reply.message ?? CHAT_MESSAGES.suggestReplyFailed,
      },
    };
  }

  return {
    success: true,
    data: {
      suggestion: reply.text,
    },
  };
}
