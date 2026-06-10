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

type FollowUpAgentProfile = {
  id: string;
  systemPrompt: string;
  provider?: string;
  model?: string;
  language?: string;
};

async function loadFollowUpAgentProfile(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  aiAgentId: string | null,
): Promise<FollowUpAgentProfile | null> {
  if (!aiAgentId) {
    return null;
  }

  const { data } = await admin
    .from("ai_agents")
    .select("id, system_prompt, provider, model, language, enabled")
    .eq("id", aiAgentId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data?.enabled) {
    return null;
  }

  return {
    id: data.id,
    systemPrompt: data.system_prompt,
    provider: data.provider ?? undefined,
    model: data.model ?? undefined,
    language: data.language ?? undefined,
  };
}

async function generateFollowUpMessage(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  contactName: string;
  channel: MessagingChannel;
  lastOutboundContent: string;
  followUpDay: 1 | 2;
  aiAgentId: string | null;
}): Promise<{ content: string; aiAgentId: string | null } | null> {
  const agent = await loadFollowUpAgentProfile(
    input.admin,
    input.businessId,
    input.aiAgentId,
  );

  if (!hasGeminiEnv() && !agent) {
    return {
      content: `Hi ${input.contactName}, just checking in — let us know if you still need help.`,
      aiAgentId: null,
    };
  }

  const systemInstruction = agent
    ? [
        agent.systemPrompt,
        "Write a short follow-up message. Keep replies under 280 characters. No markdown.",
      ].join("\n\n")
    : "You write polite sales follow-up messages. Keep replies under 280 characters.";

  const result = await generateText({
    businessId: input.businessId,
    provider: agent?.provider as "gemini" | "openai" | "claude" | undefined,
    model: agent?.model,
    prompt: [
      `Write a short follow-up #${input.followUpDay} for ${input.channel}.`,
      agent?.language ? `Reply language: ${agent.language}` : null,
      `Customer name: ${input.contactName}`,
      `Previous message we sent: ${input.lastOutboundContent}`,
      "Goal: gentle nudge, 1-2 sentences, no markdown.",
    ]
      .filter(Boolean)
      .join("\n"),
    systemInstruction,
  });

  if (!result.success) {
    return null;
  }

  return {
    content: result.data.text.trim().slice(0, 500),
    aiAgentId: agent?.id ?? null,
  };
}

async function sendFollowUpOnChannel(input: {
  admin: ReturnType<typeof createAdminClient>;
  candidate: FollowUpCandidate;
  content: string;
  aiAgentId?: string | null;
}): Promise<boolean> {
  const { admin, candidate } = input;

  if (candidate.channel === "website_forms") {
    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
      aiAgentId: input.aiAgentId ?? null,
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
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }

    await insertChannelMessage(admin, {
      conversationId: candidate.conversationId,
      channel: candidate.channel,
      senderType: "ai",
      content: input.content,
      aiGenerated: true,
      aiAgentId: input.aiAgentId ?? null,
    });
  } else if (candidate.channel === "instagram") {
    const sendResult = await sendInstagramChatMessage(
      candidate.businessId,
      candidate.conversationId,
      input.content,
    );

    if (!sendResult.success) {
      return false;
    }
  } else if (candidate.channel === "telegram") {
    const sendResult = await sendTelegramChatMessage(
      candidate.businessId,
      candidate.conversationId,
      input.content,
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
  const followUpAgentByBusiness = new Map<string, string | null>();
  let sent = 0;

  for (const candidate of candidates) {
    if (!followUpAgentByBusiness.has(candidate.businessId)) {
      const { data: config } = await admin
        .from("business_ai_config")
        .select("follow_up_agent_id")
        .eq("business_id", candidate.businessId)
        .maybeSingle();

      followUpAgentByBusiness.set(
        candidate.businessId,
        config?.follow_up_agent_id ?? null,
      );
    }

    const generated = await generateFollowUpMessage({
      admin,
      businessId: candidate.businessId,
      contactName: candidate.contactName,
      channel: candidate.channel,
      lastOutboundContent: candidate.lastOutboundContent,
      followUpDay: candidate.followUpDay,
      aiAgentId: followUpAgentByBusiness.get(candidate.businessId) ?? null,
    });

    if (!generated) {
      continue;
    }

    const delivered = await sendFollowUpOnChannel({
      admin,
      candidate,
      content: generated.content,
      aiAgentId: generated.aiAgentId,
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
