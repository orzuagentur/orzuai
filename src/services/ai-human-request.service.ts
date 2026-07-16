import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  resolveHumanRequestNotification,
  upsertHumanRequestNotification,
} from "@/services/business-notifications.service";
import { scheduleAiHumanRequestPush } from "@/services/push-notifications.service";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
} from "@/services/messaging.service";
import type { AiHumanRequest } from "@/types/ai-human-request.types";
import type { Database, MessagingChannel } from "@/types/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMessagePreviewText } from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

const HANDOFF_SLA_ESCALATE_MS = 5 * 60 * 1000;
const HANDOFF_SLA_MAX_ESCALATIONS = 3;

const REQUEST_SELECT =
  "id, business_id, conversation_id, contact_id, channel, contact_name, reason, message_preview, created_at";

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
    .select(REQUEST_SELECT)
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToAiHumanRequest);
}

export async function maybeQueueImmediateHumanRequest(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  clientMessage: string;
  contactId?: string | null;
  contactName?: string | null;
}): Promise<void> {
  // Handoff is handled only by the background orchestrator after explicit confirmation.
  // Immediate keyword alerts caused false manager escalations before the AI could help.
  void input;
  return;
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
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
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
        status: "pending",
        accepted_at: null,
        accepted_by: null,
        escalate_count: 0,
        last_escalated_at: null,
        resolved_at: null,
      })
      .eq("id", existing.id)
      .select(REQUEST_SELECT)
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

    await upsertHumanRequestNotification({
      admin: input.admin,
      businessId: input.businessId,
      conversationId: input.conversationId,
      channel: input.channel,
      contactId: input.contactId,
      contactName,
      reason,
      messagePreview,
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
      status: "pending",
      escalate_count: 0,
    })
    .select(REQUEST_SELECT)
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

  await upsertHumanRequestNotification({
    admin: input.admin,
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
    contactId: input.contactId,
    contactName,
    reason,
    messagePreview,
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
  const now = new Date().toISOString();

  const { data, error } = await input.admin
    .from("ai_human_requests")
    .update({
      status: "accepted",
      accepted_at: now,
      resolved_at: now,
    })
    .eq("id", input.requestId)
    .eq("business_id", input.businessId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return false;
  }

  await resolveHumanRequestNotification({
    admin: input.admin,
    businessId: input.businessId,
    requestId: input.requestId,
  });

  return true;
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
    .eq("status", "pending")
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

  const now = new Date().toISOString();
  const { data: declined, error } = await input.admin
    .from("ai_human_requests")
    .update({
      status: "declined",
      resolved_at: now,
    })
    .eq("id", input.requestId)
    .eq("business_id", input.businessId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!declined) {
    return { success: false, customerNotified };
  }

  await resolveHumanRequestNotification({
    admin: input.admin,
    businessId: input.businessId,
    requestId: input.requestId,
  });

  return {
    success: true,
    customerNotified,
  };
}

export async function escalateDueAiHumanRequests(): Promise<{
  processed: number;
  escalated: number;
}> {
  const admin = createAdminClient();
  const threshold = new Date(Date.now() - HANDOFF_SLA_ESCALATE_MS).toISOString();

  const { data: candidates, error } = await admin
    .from("ai_human_requests")
    .select(
      "id, business_id, conversation_id, contact_id, channel, contact_name, reason, message_preview, escalate_count, last_escalated_at, created_at",
    )
    .eq("status", "pending")
    .lt("escalate_count", HANDOFF_SLA_MAX_ESCALATIONS)
    .lte("created_at", threshold)
    .or(`last_escalated_at.is.null,last_escalated_at.lte.${threshold}`)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const rows = candidates ?? [];
  let escalated = 0;

  for (const row of rows) {
    const now = new Date().toISOString();
    const nextCount = (row.escalate_count ?? 0) + 1;

    scheduleAiHumanRequestPush({
      businessId: row.business_id,
      conversationId: row.conversation_id,
      channel: row.channel as MessagingChannel,
      contactName: row.contact_name,
      reason: row.reason,
      requestId: row.id,
    });

    await upsertHumanRequestNotification({
      admin,
      businessId: row.business_id,
      conversationId: row.conversation_id,
      channel: row.channel as MessagingChannel,
      contactId: row.contact_id,
      contactName: row.contact_name,
      reason: row.reason,
      messagePreview: row.message_preview,
      requestId: row.id,
    });

    const { error: updateError } = await admin
      .from("ai_human_requests")
      .update({
        last_escalated_at: now,
        escalate_count: nextCount,
        status: "pending",
      })
      .eq("id", row.id)
      .eq("status", "pending");

    if (updateError) {
      console.error(
        "[ai-human-request] failed to escalate request",
        row.id,
        updateError,
      );
      continue;
    }

    escalated += 1;
    console.info(
      "[ai-human-request]",
      JSON.stringify({
        action: "escalated",
        requestId: row.id,
        escalateCount: nextCount,
      }),
    );
  }

  return {
    processed: rows.length,
    escalated,
  };
}

export async function getHandoffSlaMetrics(businessId: string): Promise<{
  avgAcceptMinutes: number | null;
  pendingCount: number;
  acceptedCount: number;
  escalatedCount: number;
}> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ai_human_requests")
    .select("status, accepted_at, created_at, escalate_count")
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  let pendingCount = 0;
  let acceptedCount = 0;
  let escalatedCount = 0;
  let acceptMinutesSum = 0;
  let acceptSamples = 0;

  for (const row of data ?? []) {
    if (row.status === "pending") {
      pendingCount += 1;
    } else if (row.status === "accepted") {
      acceptedCount += 1;
    }

    if ((row.escalate_count ?? 0) > 0) {
      escalatedCount += 1;
    }

    if (row.status === "accepted" && row.accepted_at) {
      const minutes =
        (new Date(row.accepted_at).getTime() -
          new Date(row.created_at).getTime()) /
        60000;

      if (Number.isFinite(minutes) && minutes >= 0) {
        acceptMinutesSum += minutes;
        acceptSamples += 1;
      }
    }
  }

  return {
    avgAcceptMinutes:
      acceptSamples > 0
        ? Math.round((acceptMinutesSum / acceptSamples) * 10) / 10
        : null,
    pendingCount,
    acceptedCount,
    escalatedCount,
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
    "Tell the customer that a human takeover was requested. Keep helping in the chat until someone joins, and do not promise an exact response time.",
  ].join("\n");
}

export function buildHumanHandoffFollowUpMessage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.includes("russian") || normalized === "ru") {
    return "Я запросил подключение человека. Пока он подключается, я продолжу помогать вам здесь.";
  }

  if (normalized.includes("uzbek") || normalized === "uz") {
    return "Inson operatorni ulashni so'radim. U ulanmaguncha shu yerda yordam berishda davom etaman.";
  }

  return "I requested a human takeover. I will keep helping here until someone joins.";
}

export async function listAiHumanRequestsForBusiness(
  businessId: string,
): Promise<AiHumanRequest[]> {
  const admin = createAdminClient();
  return listAiHumanRequests(admin, businessId);
}

export async function dismissAiHumanRequestForBusiness(input: {
  businessId: string;
  requestId: string;
}): Promise<boolean> {
  const admin = createAdminClient();

  return dismissAiHumanRequest({
    admin,
    businessId: input.businessId,
    requestId: input.requestId,
  });
}

export async function declineAiHumanRequestForBusiness(input: {
  businessId: string;
  requestId: string;
}): Promise<{ success: boolean; customerNotified: boolean }> {
  const admin = createAdminClient();

  return declineAiHumanRequestWithNotice({
    admin,
    businessId: input.businessId,
    requestId: input.requestId,
  });
}
