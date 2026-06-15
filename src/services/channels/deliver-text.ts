import "server-only";

import { sendInstagramTextMessage } from "@/lib/instagram/client";
import { sendTelegramTextMessage } from "@/lib/telegram/client";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
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
}): Promise<ChannelTextDeliveryResult> {
  if (input.channel === "website_forms") {
    return { success: true };
  }

  if (input.channel === "whatsapp") {
    const { data: connection } = await input.admin
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", input.businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

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
    const { data: connection } = await input.admin
      .from("telegram_connections")
      .select("bot_token")
      .eq("business_id", input.businessId)
      .eq("telegram_status", "connected")
      .maybeSingle();

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
    const { data: connection } = await input.admin
      .from("instagram_connections")
      .select("meta_access_token, meta_page_id")
      .eq("business_id", input.businessId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection?.meta_access_token || !connection.meta_page_id) {
      return { success: false, error: "Instagram is not connected." };
    }

    const sendResult = await sendInstagramTextMessage(
      connection.meta_page_id,
      connection.meta_access_token,
      input.recipientId,
      input.content,
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true, providerMessageId: sendResult.messageId };
  }

  if (input.channel === "email") {
    return deliverEmailTextMessage({
      admin: input.admin,
      recipientEmail: input.recipientId,
      subject: "Message from your business",
      content: input.content,
    });
  }

  if (input.channel === "facebook_messenger") {
    return deliverFacebookMessengerTextMessage();
  }

  return { success: false, error: `Unsupported channel: ${input.channel}` };
}
