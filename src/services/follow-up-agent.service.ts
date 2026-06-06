import "server-only";

import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInstagramChatMessage } from "@/services/instagram.service";
import { generateText } from "@/services/llm.service";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
} from "@/services/messaging.service";
import { sendTelegramChatMessage } from "@/services/telegram.service";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import type { MessagingChannel } from "@/types/database.types";

const HOUR_MS = 60 * 60 * 1000;
const FOLLOW_UP_WINDOWS = [
  { day: 1 as const, hours: 24 },
  { day: 2 as const, hours: 48 },
] as const;

type FollowUpCandidate = {
  conversationId: string;
  businessId: string;
  channel: MessagingChannel;
  followUpDay: 1 | 2;
  contactName: string;
  lastOutboundContent: string;
};

async function isChannelConnected(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  channel: MessagingChannel,
): Promise<boolean> {
  if (channel === "whatsapp") {
    const { data } = await admin
      .from("whatsapp_connections")
      .select("whatsapp_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.whatsapp_status === "connected";
  }

  if (channel === "instagram") {
    const { data } = await admin
      .from("instagram_connections")
      .select("instagram_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.instagram_status === "connected";
  }

  if (channel === "telegram") {
    const { data } = await admin
      .from("telegram_connections")
      .select("telegram_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.telegram_status === "connected";
  }

  return channel === "website_forms";
}

async function generateFollowUpMessage(input: {
  businessId: string;
  contactName: string;
  channel: MessagingChannel;
  lastOutboundContent: string;
  followUpDay: 1 | 2;
}): Promise<string | null> {
  if (!hasGeminiEnv()) {
    return `Hi ${input.contactName}, just checking in — let us know if you still need help.`;
  }

  const result = await generateText({
    businessId: input.businessId,
    prompt: [
      `Write a short follow-up #${input.followUpDay} for ${input.channel}.`,
      `Customer name: ${input.contactName}`,
      `Previous message we sent: ${input.lastOutboundContent}`,
      "Goal: gentle nudge, 1-2 sentences, no markdown.",
    ].join("\n"),
    systemInstruction:
      "You write polite sales follow-up messages. Keep replies under 280 characters.",
  });

  if (!result.success) {
    return null;
  }

  return result.data.text.trim().slice(0, 500);
}

async function sendFollowUpOnChannel(input: {
  admin: ReturnType<typeof createAdminClient>;
  candidate: FollowUpCandidate;
  content: string;
}): Promise<boolean> {
  const { admin, candidate, content } = input;

  if (candidate.channel === "website_forms") {
    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content,
      aiGenerated: true,
    });

    await incrementMessagingAnalytics(admin, candidate.businessId, candidate.channel, {
      totalMessages: 1,
      aiReplies: 1,
    });

    return true;
  }

  if (candidate.channel === "whatsapp") {
    const { data: conversation } = await admin
      .from("conversations")
      .select("contact:contacts(phone_number)")
      .eq("id", candidate.conversationId)
      .maybeSingle();

    const contact = Array.isArray(conversation?.contact)
      ? conversation.contact[0]
      : conversation?.contact;

    const { data: whatsappConnection } = await admin
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", candidate.businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (
      !contact?.phone_number ||
      !whatsappConnection?.meta_phone_number_id ||
      !whatsappConnection.meta_access_token
    ) {
      return false;
    }

    const sendResult = await sendWhatsAppTextMessage(
      whatsappConnection.meta_phone_number_id,
      whatsappConnection.meta_access_token,
      contact.phone_number.replace(/[^\d+]/g, ""),
      content,
    );

    if (!sendResult.success) {
      return false;
    }

    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content,
      aiGenerated: true,
    });
  } else if (candidate.channel === "instagram") {
    const sendResult = await sendInstagramChatMessage(
      candidate.businessId,
      candidate.conversationId,
      content,
    );

    if (!sendResult.success) {
      return false;
    }
  } else if (candidate.channel === "telegram") {
    const sendResult = await sendTelegramChatMessage(
      candidate.businessId,
      candidate.conversationId,
      content,
    );

    if (!sendResult.success) {
      return false;
    }
  } else {
    return false;
  }

  await incrementMessagingAnalytics(admin, candidate.businessId, candidate.channel, {
    totalMessages: 1,
    aiReplies: 1,
  });

  return true;
}

async function listFollowUpCandidates(
  admin: ReturnType<typeof createAdminClient>,
): Promise<FollowUpCandidate[]> {
  const now = Date.now();
  const candidates: FollowUpCandidate[] = [];

  const { data: conversations } = await admin
    .from("conversations")
    .select("id, business_id, channel, status, contact:contacts(name)")
    .in("status", ["open", "pending", "active"])
    .in("channel", ["whatsapp", "instagram", "telegram", "website_forms"])
    .order("updated_at", { ascending: false })
    .limit(200);

  for (const conversation of conversations ?? []) {
    const { data: messageRows } = await admin
      .from("messages")
      .select("sender_type, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    const messages = messageRows ?? [];

    if (messages.length === 0) {
      continue;
    }

    const lastMessage = messages.at(-1);

    if (!lastMessage || lastMessage.sender_type === "client") {
      continue;
    }

    const lastOutboundAt = new Date(lastMessage.created_at).getTime();
    const contact = Array.isArray(conversation.contact)
      ? conversation.contact[0]
      : conversation.contact;

    for (const window of FOLLOW_UP_WINDOWS) {
      const dueAt = lastOutboundAt + window.hours * HOUR_MS;

      if (now < dueAt) {
        continue;
      }

      const hasClientReplyAfter = messages.some(
        (message) =>
          message.sender_type === "client" &&
          new Date(message.created_at).getTime() > lastOutboundAt,
      );

      if (hasClientReplyAfter) {
        continue;
      }

      const { data: existingFollowUp } = await admin
        .from("conversation_follow_ups")
        .select("id")
        .eq("conversation_id", conversation.id)
        .eq("follow_up_day", window.day)
        .maybeSingle();

      if (existingFollowUp) {
        continue;
      }

      const { data: aiSettings } = await admin
        .from("ai_settings")
        .select("ai_enabled")
        .eq("business_id", conversation.business_id)
        .eq("channel", conversation.channel)
        .maybeSingle();

      if (!aiSettings?.ai_enabled) {
        continue;
      }

      const { data: followUpConfig } = await admin
        .from("business_ai_config")
        .select("follow_up_agent_enabled")
        .eq("business_id", conversation.business_id)
        .maybeSingle();

      if (followUpConfig?.follow_up_agent_enabled === false) {
        continue;
      }

      const connected = await isChannelConnected(
        admin,
        conversation.business_id,
        conversation.channel,
      );

      if (!connected) {
        continue;
      }

      candidates.push({
        conversationId: conversation.id,
        businessId: conversation.business_id,
        channel: conversation.channel,
        followUpDay: window.day,
        contactName: contact?.name ?? "there",
        lastOutboundContent: lastMessage.content,
      });
    }
  }

  return candidates;
}

export async function runDueConversationFollowUps(): Promise<{
  processed: number;
  sent: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, sent: 0 };
  }

  const admin = createAdminClient();
  const candidates = await listFollowUpCandidates(admin);
  let sent = 0;

  for (const candidate of candidates) {
    const content = await generateFollowUpMessage({
      businessId: candidate.businessId,
      contactName: candidate.contactName,
      channel: candidate.channel,
      lastOutboundContent: candidate.lastOutboundContent,
      followUpDay: candidate.followUpDay,
    });

    if (!content) {
      continue;
    }

    const delivered = await sendFollowUpOnChannel({
      admin,
      candidate,
      content,
    });

    if (!delivered) {
      continue;
    }

    const { error } = await admin.from("conversation_follow_ups").insert({
      conversation_id: candidate.conversationId,
      business_id: candidate.businessId,
      follow_up_day: candidate.followUpDay,
    });

    if (!error) {
      sent += 1;
    }
  }

  return {
    processed: candidates.length,
    sent,
  };
}
