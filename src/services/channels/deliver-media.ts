import "server-only";

import { sendInstagramMediaMessage } from "@/lib/instagram/client";
import { sendTelegramMediaMessage } from "@/lib/telegram/client";
import {
  sendWhatsAppMediaMessage,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp/client";
import { getChatAttachmentSignedUrl } from "@/services/chat-attachment-storage.service";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMediaMessage, type ChatMediaKind } from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

export type ChannelMediaDeliveryInput = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  recipientId: string;
  content: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  mediaKind: ChatMediaKind;
  storagePath: string;
};

function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  return new Blob([new Uint8Array(buffer)], { type: mimeType });
}

export async function deliverChannelMediaMessage(
  input: ChannelMediaDeliveryInput,
): Promise<ChannelTextDeliveryResult> {
  const { text: caption } = parseMediaMessage(input.content);
  const blob = bufferToBlob(input.buffer, input.mimeType);

  if (input.channel === "website_forms" || input.channel === "email") {
    return { success: true };
  }

  if (input.channel === "facebook_messenger") {
    return {
      success: false,
      error: "Facebook Messenger media is not connected yet.",
    };
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

    const uploadResult = await uploadWhatsAppMedia(
      connection.meta_phone_number_id,
      connection.meta_access_token,
      blob,
      input.mimeType,
      input.fileName,
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.message };
    }

    const sendResult = await sendWhatsAppMediaMessage(
      connection.meta_phone_number_id,
      connection.meta_access_token,
      input.recipientId,
      input.mediaKind,
      uploadResult.mediaId,
      {
        caption: caption || undefined,
        filename: input.fileName,
      },
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

    const sendResult = await sendTelegramMediaMessage(
      connection.bot_token,
      input.recipientId,
      blob,
      input.fileName,
      input.mimeType,
      { caption: caption || undefined },
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true };
  }

  if (input.channel === "instagram") {
    const { data: connection } = await input.admin
      .from("instagram_connections")
      .select("meta_page_id, meta_access_token")
      .eq("business_id", input.businessId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection?.meta_page_id || !connection.meta_access_token) {
      return { success: false, error: "Instagram is not connected." };
    }

    const instagramMediaUrl = await getChatAttachmentSignedUrl(
      input.storagePath,
      3600,
    );

    if (!instagramMediaUrl) {
      return { success: false, error: "Unable to sign media URL." };
    }

    const sendResult = await sendInstagramMediaMessage(
      connection.meta_page_id,
      connection.meta_access_token,
      input.recipientId,
      input.mediaKind,
      instagramMediaUrl,
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true, providerMessageId: sendResult.messageId };
  }

  return { success: false, error: `Unsupported channel: ${input.channel}` };
}
