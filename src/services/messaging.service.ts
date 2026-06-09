import "server-only";

import { incrementChannelAnalytics } from "@/lib/channel-analytics";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiProvider } from "@/lib/ai/constants";
import { generateAssistantReply } from "@/services/llm.service";
import { processHighIntentTaskRule } from "@/services/high-intent-task.service";
import { processSalesAgentRules } from "@/services/sales-agent.service";
import { analyzeAndStoreSentiment } from "@/services/sentiment.service";
import type { Database, MessageSenderType, MessagingChannel } from "@/types/database.types";
import { canonicalPhoneNumber, phoneDigitsOnly } from "@/utils/whatsapp";

type MessagingDbClient = SupabaseClient<Database>;

const OPEN_CONVERSATION_STATUSES = ["open", "pending", "active"] as const;

export type ChannelMessageInsert = {
  conversationId: string;
  channel: MessagingChannel;
  senderType: MessageSenderType;
  content: string;
  aiGenerated?: boolean;
};

export async function insertChannelMessage(
  admin: MessagingDbClient,
  input: ChannelMessageInsert,
): Promise<void> {
  await admin.from("messages").insert({
    conversation_id: input.conversationId,
    channel: input.channel,
    sender_type: input.senderType,
    content: input.content,
    ai_generated: input.aiGenerated ?? false,
  });
}

export async function findContactForChannel(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  identifier: string,
): Promise<{ id: string } | null> {
  if (channel === "whatsapp") {
    const canonical = canonicalPhoneNumber(identifier);
    const digits = phoneDigitsOnly(identifier);
    const variants = [...new Set([canonical, digits, `+${digits}`].filter(Boolean))];

    for (const phoneNumber of variants) {
      const { data } = await admin
        .from("contacts")
        .select("id")
        .eq("business_id", businessId)
        .eq("channel", channel)
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (data?.id) {
        return { id: data.id };
      }
    }

    return null;
  }

  const { data } = await admin
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("phone_number", identifier)
    .maybeSingle();

  return data?.id ? { id: data.id } : null;
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

export async function listKnowledgeEntriesForBusiness(
  admin: MessagingDbClient,
  businessId: string,
) {
  const { data } = await admin
    .from("knowledge_base")
    .select("title, content, category")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(25);

  return data ?? [];
}

export async function processChannelAutoReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
  sendReply: (text: string) => Promise<{ success: boolean }>;
}): Promise<void> {
  const { admin, businessId, channel, conversationId, clientMessage, sendReply } =
    input;

  const { data: aiSettings } = await admin
    .from("ai_settings")
    .select("*")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  if (!aiSettings?.ai_enabled) {
    return;
  }

  const { data: conversation } = await admin
    .from("conversations")
    .select("contact_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversation?.contact_id) {
    await analyzeAndStoreSentiment({
      admin,
      businessId,
      contactId: conversation.contact_id,
      message: clientMessage,
    });

    await processSalesAgentRules({
      admin,
      businessId,
      contactId: conversation.contact_id,
      message: clientMessage,
    });

    await processHighIntentTaskRule({
      admin,
      businessId,
      contactId: conversation.contact_id,
      message: clientMessage,
    });
  }

  const provider = (aiSettings.provider ?? "gemini") as AiProvider;

  const { data: history } = await admin
    .from("messages")
    .select("sender_type, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const knowledgeEntries = await listKnowledgeEntriesForBusiness(
    admin,
    businessId,
  );

  const reply = await generateAssistantReply({
    businessId,
    conversationId,
    provider,
    model: aiSettings.model,
    systemPrompt: aiSettings.system_prompt,
    language: aiSettings.language,
    userMessage: clientMessage,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
    })),
    conversationHistory:
      history?.map((message) => ({
        role: message.sender_type === "client" ? "user" : "assistant",
        content: message.content,
      })) ?? [],
  });

  if (!reply.success) {
    return;
  }

  const sendResult = await sendReply(reply.data.text);

  if (!sendResult.success) {
    return;
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel,
    senderType: "ai",
    content: reply.data.text,
    aiGenerated: true,
  });

  await incrementMessagingAnalytics(admin, businessId, channel, {
    totalMessages: 1,
    aiReplies: 1,
  });
}
