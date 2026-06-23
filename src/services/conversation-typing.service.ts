import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { sendTelegramChatAction } from "@/lib/telegram/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { broadcastConversationTyping } from "@/services/conversation-realtime-broadcast.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { findContactForChannel } from "@/services/messaging.service";
import type { MessagingChannel } from "@/types/database.types";
import { resolveContactFromRow } from "@/utils/chat";

function resolveRecipientId(
  channel: MessagingChannel,
  phoneNumber: string,
): string | null {
  if (channel === "whatsapp") {
    return phoneNumber.replace(/^\+/, "");
  }

  if (channel === "telegram") {
    return phoneNumber.replace(/^tg:/, "") || null;
  }

  if (channel === "instagram") {
    return phoneNumber.replace(/^ig:/, "") || null;
  }

  return null;
}

export async function resolveConversationIdForChannelSender(
  businessId: string,
  channel: MessagingChannel,
  senderIdentifier: string,
): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const contact = await findContactForChannel(
    admin,
    businessId,
    channel,
    senderIdentifier,
  );

  if (!contact?.id) {
    return null;
  }

  const { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contact.id)
    .eq("channel", channel)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return conversation?.id ?? null;
}

export async function notifyClientTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  await broadcastConversationTyping(conversationId, "client", isTyping);
}

export async function sendAgentTypingToChannel(
  conversationId: string,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return;
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, channel, contact:contacts(phone_number)")
    .eq("id", conversationId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!conversation) {
    return;
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return;
  }

  const recipientId = resolveRecipientId(
    conversation.channel,
    contact.phone_number,
  );

  if (!recipientId) {
    return;
  }

  await broadcastConversationTyping(conversationId, "agent", true);

  if (conversation.channel === "telegram") {
    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("bot_token")
      .eq("business_id", business.id)
      .eq("telegram_status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connection?.bot_token) {
      await sendTelegramChatAction(
        connection.bot_token,
        recipientId,
        "typing",
      );
    }

    return;
  }

}

export async function stopAgentTypingBroadcast(
  conversationId: string,
): Promise<void> {
  await broadcastConversationTyping(conversationId, "agent", false);
}

export type SendAgentTypingResult =
  | { success: true }
  | { success: false; error: { code: string; message: string } };

export async function sendAgentTypingIndicator(
  conversationId: string,
): Promise<SendAgentTypingResult> {
  const trimmedId = conversationId?.trim();

  if (!trimmedId) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  try {
    await sendAgentTypingToChannel(trimmedId);
    return { success: true };
  } catch {
    return {
      success: false,
      error: {
        code: "TYPING_FAILED",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }
}
