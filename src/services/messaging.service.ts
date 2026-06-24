import "server-only";

import { incrementChannelAnalytics } from "@/lib/channel-analytics";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  generateFastAssistantReply,
  isChannelAutoReplyEnabled,
} from "@/services/auto-reply-pipeline.service";
import type { AutoReplyGenerationFailure } from "@/services/auto-reply-pipeline.service";
import { enqueueAiOrchestrationJob } from "@/services/ai-orchestration-queue.service";
import { scheduleDebouncedChannelAutoReply } from "@/services/ai-reply-queue.service";
import { maybeQueueImmediateHumanRequest } from "@/services/ai-human-request.service";
import {
  attachVoiceReplyMetadata,
  loadVoiceReplySettings,
  sendChannelAutoReplyVoice,
  shouldUseVoiceAutoReply,
} from "@/services/ai-voice-reply.service";
import { sendChannelAutoReplyText } from "@/services/channels/channel-auto-reply-send.service";
import { notifyAutoReplyError } from "@/services/auto-reply-inbox-status.service";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { retrieveKnowledgeForMessage } from "@/services/knowledge-retrieval.service";
import { scheduleInboundMessageEffects } from "@/services/inbound-message-effects.service";
import { updateConversationLastMessageFromInsert } from "@/services/conversation-last-message.service";
import type { Database, MessageSenderType, MessagingChannel } from "@/types/database.types";
import { findContactForChannelWithIdentities } from "@/services/contact-channel-identity.service";

type MessagingDbClient = SupabaseClient<Database>;

const OPEN_CONVERSATION_STATUSES = ["open", "pending", "active"] as const;

export type ChannelMessageInsert = {
  conversationId: string;
  channel: MessagingChannel;
  senderType: MessageSenderType;
  content: string;
  emailSubject?: string | null;
  aiGenerated?: boolean;
  externalMessageId?: string | null;
};

export type InsertedChannelMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  email_subject?: string | null;
  ai_generated: boolean;
  created_at: string;
  sent_at?: string;
  external_message_id?: string | null;
};

export async function findMessageByExternalId(
  admin: MessagingDbClient,
  channel: MessagingChannel,
  externalMessageId: string,
): Promise<InsertedChannelMessageRow | null> {
  const { data } = await admin
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at, sent_at, external_message_id",
    )
    .eq("channel", channel)
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  return data;
}

export async function insertChannelMessage(
  admin: MessagingDbClient,
  input: ChannelMessageInsert,
): Promise<InsertedChannelMessageRow> {
  if (input.externalMessageId) {
    const existing = await findMessageByExternalId(
      admin,
      input.channel,
      input.externalMessageId,
    );

    if (existing) {
      return existing;
    }
  }

  const { data: inserted, error } = await admin
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      channel: input.channel,
      sender_type: input.senderType,
      content: input.content,
      email_subject: input.emailSubject?.trim() || null,
      ai_generated: input.aiGenerated ?? false,
      external_message_id: input.externalMessageId ?? null,
    })
    .select(
      "id, conversation_id, channel, sender_type, content, email_subject, ai_generated, created_at, sent_at, external_message_id",
    )
    .single();

  if (error) {
    if (input.externalMessageId && error.code === "23505") {
      const existing = await findMessageByExternalId(
        admin,
        input.channel,
        input.externalMessageId,
      );

      if (existing) {
        return existing;
      }
    }

    throw error;
  }

  await updateConversationLastMessageFromInsert(admin, {
    conversationId: input.conversationId,
    content: input.content,
    emailSubject: input.emailSubject,
    channel: input.channel,
    senderType: input.senderType,
    aiGenerated: input.aiGenerated,
    createdAt: inserted.sent_at ?? inserted.created_at,
  });

  return inserted;
}

export async function markOutboundMessageFailed(
  admin: MessagingDbClient,
  messageId: string,
): Promise<void> {
  await admin
    .from("messages")
    .update({ hidden_for_business: true })
    .eq("id", messageId);

  await admin
    .from("message_deliveries")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
    })
    .eq("message_id", messageId);
}

const DELIVERY_RETRY_BASE_SECONDS = 30;

function computeDeliveryRetryAt(attemptCount: number): string {
  const delaySeconds =
    DELIVERY_RETRY_BASE_SECONDS * 2 ** Math.max(0, attemptCount - 1);

  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

export async function createOutboundMessageDelivery(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    businessId: string;
    channel: MessagingChannel;
    conversationId?: string;
  },
): Promise<void> {
  let conversationId = input.conversationId ?? null;

  if (!conversationId) {
    const { data: message } = await admin
      .from("messages")
      .select("conversation_id")
      .eq("id", input.messageId)
      .maybeSingle();
    conversationId = message?.conversation_id ?? null;
  }

  const { error } = await admin.from("message_deliveries").upsert(
    {
      message_id: input.messageId,
      business_id: input.businessId,
      channel: input.channel,
      conversation_id: conversationId,
      status: "pending",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
    },
    { onConflict: "message_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[message-delivery] create failed", error.message);
  }
}

export async function recordMessageDeliverySuccess(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    providerMessageId?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from("message_deliveries")
    .update({
      status: "sent",
      provider_message_id: input.providerMessageId ?? null,
      sent_at: now,
      last_error: null,
    })
    .eq("message_id", input.messageId);
}

export async function recordMessageDeliveryFailure(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    errorMessage: string;
    hideMessageOnExhausted?: boolean;
  },
): Promise<void> {
  const { data: delivery } = await admin
    .from("message_deliveries")
    .select("attempt_count, max_attempts")
    .eq("message_id", input.messageId)
    .maybeSingle();

  const attemptCount = (delivery?.attempt_count ?? 0) + 1;
  const maxAttempts = delivery?.max_attempts ?? 5;
  const exhausted = attemptCount >= maxAttempts;
  const now = new Date().toISOString();

  await admin
    .from("message_deliveries")
    .update({
      status: exhausted ? "failed" : "pending",
      attempt_count: attemptCount,
      next_attempt_at: exhausted ? now : computeDeliveryRetryAt(attemptCount),
      last_error: input.errorMessage.slice(0, 2000),
      failed_at: exhausted ? now : null,
    })
    .eq("message_id", input.messageId);

  if (exhausted && input.hideMessageOnExhausted !== false) {
    await admin
      .from("messages")
      .update({ hidden_for_business: true })
      .eq("id", input.messageId);
  }
}

export async function updateChannelMessageContent(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    content: string;
  },
): Promise<void> {
  const { error } = await admin
    .from("messages")
    .update({ content: input.content })
    .eq("id", input.messageId);

  if (error) {
    throw error;
  }
}

export async function findContactForChannel(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  identifier: string,
): Promise<{ id: string } | null> {
  return findContactForChannelWithIdentities(
    admin,
    businessId,
    channel,
    identifier,
  );
}

export async function resolveInboundConversation(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  channel: MessagingChannel,
): Promise<string | null> {
  const now = new Date().toISOString();

  const { data: openConversation } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("channel", channel)
    .in("status", [...OPEN_CONVERSATION_STATUSES])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openConversation?.id) {
    return openConversation.id;
  }

  const { data: latestConversation } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("channel", channel)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestConversation?.id) {
    await admin
      .from("conversations")
      .update({ status: "open", updated_at: now })
      .eq("id", latestConversation.id);

    return latestConversation.id;
  }

  const { data: createdConversation } = await admin
    .from("conversations")
    .insert({
      business_id: businessId,
      channel,
      contact_id: contactId,
      status: "open",
    })
    .select("id")
    .single();

  return createdConversation?.id ?? null;
}

export async function incrementMessagingAnalytics(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  updates: {
    totalMessages?: number;
    totalContacts?: number;
    aiReplies?: number;
  },
): Promise<void> {
  const { data: analytics } = await admin
    .from("analytics")
    .select("total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId)
    .maybeSingle();

  await admin.from("analytics").upsert(
    {
      business_id: businessId,
      total_messages:
        (analytics?.total_messages ?? 0) + (updates.totalMessages ?? 0),
      total_contacts:
        (analytics?.total_contacts ?? 0) + (updates.totalContacts ?? 0),
      ai_replies: (analytics?.ai_replies ?? 0) + (updates.aiReplies ?? 0),
    },
    { onConflict: "business_id" },
  );

  await incrementChannelAnalytics(admin, businessId, channel, updates);
}

export function scheduleMessagingAnalyticsIncrement(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  updates: {
    totalMessages?: number;
    totalContacts?: number;
    aiReplies?: number;
  },
): void {
  void incrementMessagingAnalytics(admin, businessId, channel, updates).catch(
    (error) => {
      console.error("[messaging] analytics increment failed", error);
    },
  );
}

export async function listKnowledgeEntriesForBusiness(
  admin: MessagingDbClient,
  businessId: string,
  query = "",
) {
  return retrieveKnowledgeForMessage({
    admin,
    businessId,
    query,
  });
}

function resolveAutoReplyErrorMessage(
  failure: AutoReplyGenerationFailure,
): { code: string; message: string } {
  if (failure.reason === "llm_failed") {
    const detail = failure.message?.trim() ?? "";
    const isQuota =
      /limit|quota|monthly/i.test(detail);

    return {
      code: failure.reason,
      message: isQuota
        ? CHAT_MESSAGES.autoReplyErrorQuota
        : detail || CHAT_MESSAGES.autoReplyErrorGeneric,
    };
  }

  if (failure.reason === "ai_disabled") {
    return {
      code: failure.reason,
      message: CHAT_MESSAGES.autoReplyErrorAiDisabled,
    };
  }

  return {
    code: failure.reason,
    message: CHAT_MESSAGES.autoReplyErrorSettings,
  };
}

export async function processChannelAutoReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<void> {
  const { admin, businessId, channel, conversationId, clientMessage } = input;

  const aiEnabled = await isChannelAutoReplyEnabled({
    admin,
    businessId,
    channel,
  });

  if (!aiEnabled) {
    await notifyAutoReplyError(conversationId, {
      errorCode: "ai_disabled",
      errorMessage: CHAT_MESSAGES.autoReplyErrorAiDisabled,
    });
    throw new Error("[ai_disabled] Auto-reply is off for this channel.");
  }

  const reply = await generateFastAssistantReply({
    admin,
    businessId,
    channel,
    conversationId,
    clientMessage,
  });

  if (!reply.success) {
    const error = resolveAutoReplyErrorMessage(reply);
    await notifyAutoReplyError(conversationId, {
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw new Error(`[${error.code}] ${error.message}`);
  }

  if (reply.isFallback) {
    console.warn(
      "[messaging] delivered fallback auto-reply",
      JSON.stringify({
        businessId,
        channel,
        conversationId,
      }),
    );
    void notifyAutoReplyError(conversationId, {
      errorCode: "llm_fallback",
      errorMessage:
        "AI could not generate a reply. A default message was sent to the customer. Check API keys and monthly AI limits.",
    });
  }

  const voiceDecision = await shouldUseVoiceAutoReply({
    admin,
    businessId,
    channel,
    conversationId,
  });

  let messageContent = reply.text;
  let sendResult: { success: boolean; error?: string; emailSubject?: string };

  if (voiceDecision.useVoice && voiceDecision.voiceId) {
    const voiceSettings = await loadVoiceReplySettings(admin, businessId);
    const voiceSendResult = await sendChannelAutoReplyVoice({
      admin,
      businessId,
      channel,
      conversationId,
      text: reply.text,
      voiceId: voiceDecision.voiceId,
      language: voiceSettings.language,
    });

    if (voiceSendResult.success && voiceSendResult.content) {
      messageContent = voiceSendResult.content;
      sendResult = { success: true };
    } else {
      console.warn(
        "[messaging] voice auto-reply failed, falling back to text",
        voiceSendResult.error,
      );
      sendResult = await sendChannelAutoReplyText({
        admin,
        businessId,
        channel,
        conversationId,
        text: reply.text,
      });
    }
  } else {
    sendResult = await sendChannelAutoReplyText({
      admin,
      businessId,
      channel,
      conversationId,
      text: reply.text,
    });
  }

  if (!sendResult.success) {
    await notifyAutoReplyError(conversationId, {
      errorCode: "send_failed",
      errorMessage: CHAT_MESSAGES.autoReplyErrorSendFailed,
    });
    throw new Error("[send_failed] Unable to deliver auto-reply.");
  }

  const inserted = await insertChannelMessage(admin, {
    conversationId,
    channel,
    senderType: "ai",
    content: messageContent,
    emailSubject: sendResult.emailSubject,
    aiGenerated: true,
  });

  if (voiceDecision.useVoice && voiceDecision.voiceId) {
    await attachVoiceReplyMetadata(admin, {
      messageId: inserted.id,
      businessId,
      content: messageContent,
    });
  }

  await incrementMessagingAnalytics(admin, businessId, channel, {
    totalMessages: 1,
    aiReplies: 1,
  });

  await enqueueAiOrchestrationJob({
    businessId,
    channel,
    conversationId,
    clientMessage,
  }).catch((error) => {
    console.error("[messaging] failed to enqueue CRM orchestration", error);
  });
}

export async function scheduleChannelAutoReply(input: {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<void> {
  await scheduleDebouncedChannelAutoReply(input);
}

export async function scheduleInboundMessageProcessing(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<void> {
  scheduleInboundMessageEffects({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    conversationId: input.conversationId,
    clientMessage: input.clientMessage,
  });

  void maybeQueueImmediateHumanRequest({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    clientMessage: input.clientMessage,
  }).catch((error) => {
    console.error("[messaging] immediate human request failed", error);
  });

  await scheduleChannelAutoReply({
    businessId: input.businessId,
    channel: input.channel,
    conversationId: input.conversationId,
    clientMessage: input.clientMessage,
  });
}
