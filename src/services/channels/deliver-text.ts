import "server-only";

import { sendTelegramTextMessage } from "@/lib/telegram/client";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import {
  getCachedTelegramDeliveryConnection,
  getCachedWhatsAppDeliveryConnection,
} from "@/services/channels/connection-cache";
import { deliverEmailTextMessage, deliverFacebookMessengerTextMessage } from "@/services/channels/deliver-email";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function deliverChannelTextMessage(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  recipientId: string;
  content: string;
  emailSubject?: string;
}): Promise<ChannelTextDeliveryResult> {
  if (input.channel === "website_forms") {
    return { success: true };
  }

  if (input.channel === "whatsapp") {
    const connection = await getCachedWhatsAppDeliveryConnection(
      input.admin,
      input.businessId,
    );

    if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
      return { success: false, error: "WhatsApp is not connected." };
    }

    const sendResult = await sendWhatsAppTextMessage(
      connection.meta_phone_number_id,
      connection.meta_access_token,
      input.recipientId.replace(/^\+/, ""),
      input.content,
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true, providerMessageId: sendResult.messageId };
  }

  if (input.channel === "telegram") {
    const connection = await getCachedTelegramDeliveryConnection(
      input.admin,
      input.businessId,
    );

    if (!connection?.bot_token) {
      return { success: false, error: "Telegram is not connected." };
    }

    const sendResult = await sendTelegramTextMessage(
      connection.bot_token,
      input.recipientId,
      input.content,
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true, providerMessageId: sendResult.messageId };
  }

  if (input.channel === "instagram") {
    return { success: false, error: "Instagram is no longer supported." };
  }

  if (input.channel === "email") {
    return deliverEmailTextMessage({
      admin: input.admin,
      businessId: input.businessId,
      recipientEmail: input.recipientId,
      subject: input.emailSubject?.trim() || "Message from your business",
      content: input.content,
    });
  }

  if (input.channel === "facebook_messenger") {
    return deliverFacebookMessengerTextMessage();
  }

  return { success: false, error: `Unsupported channel: ${input.channel}` };
}
