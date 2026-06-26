import "server-only";

import { sendTelegramChatAction } from "@/lib/telegram/client";
import type { AutoReplyStatusPayload } from "@/lib/realtime/conversation-channel";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastAutoReplyStatus } from "@/services/conversation-realtime-broadcast.service";
import { getCachedTelegramDeliveryConnection } from "@/services/channels/connection-cache";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export type AutoReplyTypingContext = {
  businessId: string;
  channel: MessagingChannel;
  admin?: MessagingDbClient;
};

async function publishAutoReplyStatus(
  conversationId: string,
  payload: Omit<AutoReplyStatusPayload, "at">,
): Promise<void> {
  try {
    await broadcastAutoReplyStatus(conversationId, {
      ...payload,
      at: Date.now(),
    });
  } catch (error) {
    console.error("[auto-reply-inbox] broadcast failed", error);
  }
}

async function sendTelegramAutoReplyTyping(
  context: AutoReplyTypingContext,
  conversationId: string,
): Promise<void> {
  if (context.channel !== "telegram") {
    return;
  }

  const admin = context.admin ?? createAdminClient();
  const recipientId = await resolveChannelRecipient(admin, {
    businessId: context.businessId,
    conversationId,
    channel: "telegram",
  });

  if (!recipientId) {
    return;
  }

  const connection = await getCachedTelegramDeliveryConnection(
    admin,
    context.businessId,
  );

  if (!connection?.bot_token) {
    return;
  }

  const result = await sendTelegramChatAction(
    connection.bot_token,
    recipientId,
    "typing",
  );

  if (!result.success) {
    console.warn(
      "[auto-reply-inbox] telegram typing failed",
      JSON.stringify({ conversationId, message: result.message }),
    );
  }
}

export async function notifyAutoReplyTyping(
  conversationId: string,
  isTyping: boolean,
  context?: AutoReplyTypingContext,
): Promise<void> {
  await publishAutoReplyStatus(conversationId, {
    status: isTyping ? "typing" : "idle",
  });

  if (isTyping && context) {
    await sendTelegramAutoReplyTyping(context, conversationId);
  }
}

export async function notifyAutoReplyError(
  conversationId: string,
  input: {
    errorCode: string;
    errorMessage: string;
  },
): Promise<void> {
  await publishAutoReplyStatus(conversationId, {
    status: "error",
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  });
}
