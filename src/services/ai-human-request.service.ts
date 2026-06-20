import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { scheduleAiHumanRequestPush } from "@/services/push-notifications.service";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
} from "@/services/messaging.service";
import type { AiHumanRequest } from "@/types/ai-human-request.types";
import type { Database, MessagingChannel } from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

function mapRowToAiHumanRequest(row: {
  id: string;
  business_id: string;
  conversation_id: string;
  contact_id: string | null;
  channel: string;
  contact_name: string;
  reason: string;
  message_preview: string;
  created_at: string;
}): AiHumanRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    conversationId: row.conversation_id,
    contactId: row.contact_id,
    channel: row.channel as MessagingChannel,
    contactName: row.contact_name,
    reason: row.reason,
    messagePreview: row.message_preview,
    createdAt: row.created_at,
  };
}

export async function listAiHumanRequests(
  admin: MessagingDbClient,
  businessId: string,
  limit = 50,
): Promise<AiHumanRequest[]> {
  const { data, error } = await admin
    .from("ai_human_requests")
    .select(
      "id, business_id, conversation_id, contact_id, channel, contact_name, reason, message_preview, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToAiHumanRequest);
}

export async function createAiHumanRequest(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId?: string | null;
  contactName?: string;
  reason: string;
  messagePreview: string;
}): Promise<AiHumanRequest | null> {
  const contactName = input.contactName?.trim() || "Customer";
  const reason = input.reason.trim() || "Customer needs a real person";
  const messagePreview = getMessagePreviewText(input.messagePreview, 200);
  const now = new Date().toISOString();

  const { data: existing } = await input.admin
    .from("ai_human_requests")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("conversation_id", input.conversationId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await input.admin
      .from("ai_human_requests")
      .update({
        contact_id: input.contactId ?? null,
        channel: input.channel,
        contact_name: contactName,
        reason,
        message_preview: messagePreview,
        created_at: now,
      })
      .eq("id", existing.id)
      .select(
        "id, business_id, conversation_id, contact_id, channel, contact_name, reason, message_preview, created_at",
      )
      .single();

    if (error || !data) {
      console.error("[ai-human-request] failed to refresh request", error);
      return null;
    }

    const request = mapRowToAiHumanRequest(data);

    scheduleAiHumanRequestPush({
      businessId: input.businessId,
      conversationId: input.conversationId,
      channel: input.channel,
      contactName,
      reason,
      requestId: request.id,
    });

    console.info(
      "[ai-human-request]",
      JSON.stringify({
        action: "refreshed",
        conversationId: input.conversationId,
        reason,
      }),
    );

    return request;
  }

  const { data, error } = await input.admin
    .from("ai_human_requests")
    .insert({
      business_id: input.businessId,
      conversation_id: input.conversationId,
      contact_id: input.contactId ?? null,
      channel: input.channel,
      contact_name: contactName,
      reason,
      message_preview: messagePreview,
    })
    .select(
      "id, business_id, conversation_id, contact_id, channel, contact_name, reason, message_preview, created_at",
    )
    .single();

  if (error || !data) {
    console.error("[ai-human-request] failed to create request", error);
    return null;
  }

  const request = mapRowToAiHumanRequest(data);

  scheduleAiHumanRequestPush({
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    contactName,
    reason,
    requestId: request.id,
  });

  console.info(
    "[ai-human-request]",
    JSON.stringify({
      action: "created",
      conversationId: input.conversationId,
      reason,
    }),
  );

  return request;
}

export async function dismissAiHumanRequest(input: {
  admin: MessagingDbClient;
  businessId: string;
  requestId: string;
}): Promise<boolean> {
  const { error, count } = await input.admin
    .from("ai_human_requests")
    .delete({ count: "exact" })
    .eq("id", input.requestId)
    .eq("business_id", input.businessId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

function buildManagerUnavailableMessage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.includes("russian") || normalized === "ru") {
    return "К сожалению, сейчас нет свободного менеджера. Я продолжу помогать вам здесь — или попробуйте связаться чуть позже.";
  }

  if (normalized.includes("uzbek") || normalized === "uz") {
    return "Afsuski, hozir bo'sh menejer yo'q. Men sizga shu yerda yordam berishda davom etaman — yoki biroz keyinroq qayta urinib ko'ring.";
  }

  return "Sorry, no team member is available right now. I'll keep helping you here — or you can try again a bit later.";
}

async function resolveAssistantLanguage(
  admin: MessagingDbClient,
  businessId: string,
): Promise<string> {
  const { data } = await admin
    .from("ai_assistant_profile")
    .select("language")
    .eq("business_id", businessId)
    .maybeSingle();

  return data?.language?.trim() || "English";
}

async function sendManagerUnavailableNotice(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
}): Promise<boolean> {
  const recipientId = await resolveChannelRecipient(input.admin, {
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
  });

  if (!recipientId) {
    return false;
  }

  const language = await resolveAssistantLanguage(input.admin, input.businessId);
  const content = buildManagerUnavailableMessage(language);

  const delivery = await deliverChannelTextMessage({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    recipientId,
    content,
  });

  if (!delivery.success) {
    console.error(
      "[ai-human-request] failed to notify customer about decline",
      delivery.error,
    );
    return false;
  }

  await insertChannelMessage(input.admin, {
    conversationId: input.conversationId,
    channel: input.channel,
    senderType: "ai",
    content,
    aiGenerated: true,
  });

  await incrementMessagingAnalytics(input.admin, input.businessId, input.channel, {
    totalMessages: 1,
    aiReplies: 1,
  });

  return true;
}

export async function declineAiHumanRequestWithNotice(input: {
  admin: MessagingDbClient;
  businessId: string;
  requestId: string;
}): Promise<{ success: boolean; customerNotified: boolean }> {
  const { data: request } = await input.admin
    .from("ai_human_requests")
    .select("id, conversation_id, channel")
    .eq("id", input.requestId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (!request) {
    return { success: false, customerNotified: false };
  }

  const customerNotified = await sendManagerUnavailableNotice({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: request.conversation_id,
    channel: request.channel as MessagingChannel,
  });

  const removed = await dismissAiHumanRequest({
    admin: input.admin,
    businessId: input.businessId,
    requestId: input.requestId,
  });

  return {
    success: removed,
    customerNotified,
  };
}

export function buildHumanRequestReplyContext(reason: string): string {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return "";
  }

  return [
    "",
    "A human help request was sent to the business owner for this message.",
    `Reason: ${trimmedReason}`,
    "Tell the customer that a real person will join the conversation shortly. Stay helpful but do not pretend you already solved what needs a human.",
  ].join("\n");
}

export function buildHumanHandoffFollowUpMessage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.includes("russian") || normalized === "ru") {
    return "Я передал запрос менеджеру — он подключится к диалогу, как только освободится.";
  }

  if (normalized.includes("uzbek") || normalized === "uz") {
    return "So'rovingizni menejerga yetkazdim — u bo'shagan zahoti suhbatga qo'shiladi.";
  }

  return "I've notified our team — a manager will join this chat as soon as they're available.";
}
