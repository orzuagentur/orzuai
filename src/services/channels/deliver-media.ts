import "server-only";

import { sendTelegramMediaMessage, sendTelegramMediaMessageByUrl } from "@/lib/telegram/client";
import {
  getCachedTelegramDeliveryConnection,
  getCachedWhatsAppDeliveryConnection,
} from "@/services/channels/connection-cache";
import {
  sendWhatsAppMediaMessage,
  sendWhatsAppMediaMessageByUrl,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp/client";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import { sendWhatsAppWebMessage } from "@/lib/whatsapp-web/worker-client";
import { transcodeRemoteVoiceNoteToOggOpus } from "@/services/voice-note-transcode.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMediaMessage, type ChatMediaKind } from "@/utils/chat-media";
import {
  buildVoiceNoteOggFileName,
  needsVoiceNoteTranscode,
} from "@/utils/voice-note";

type MessagingDbClient = SupabaseClient<Database>;

export type ChannelMediaDeliveryInput = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  recipientId: string;
  content: string;
  mediaUrl: string;
  fileName: string;
  mimeType: string;
  mediaKind: ChatMediaKind;
  idempotencyKey?: string;
};

export async function deliverChannelMediaMessage(
  input: ChannelMediaDeliveryInput,
): Promise<ChannelTextDeliveryResult> {
  const { text: caption } = parseMediaMessage(input.content);

  if (
    input.channel === "website_forms" ||
    input.channel === "email" ||
    input.channel === "outlook"
  ) {
    return { success: true };
  }

  if (input.channel === "facebook_messenger") {
    return {
      success: false,
      error: "Facebook Messenger media is not connected yet.",
    };
  }

  if (input.channel === "whatsapp") {
    const connection = await getCachedWhatsAppDeliveryConnection(
      input.admin,
      input.businessId,
    );

    if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
      return { success: false, error: "WhatsApp is not connected." };
    }

    const phoneNumberId = connection.meta_phone_number_id;
    const apiKey = connection.meta_access_token;

    if (
      needsVoiceNoteTranscode({
        fileName: input.fileName,
        mimeType: input.mimeType,
        kind: input.mediaKind,
      })
    ) {
      try {
        const oggBuffer = await transcodeRemoteVoiceNoteToOggOpus(
          input.mediaUrl,
          input.mimeType,
        );
        const oggFileName = buildVoiceNoteOggFileName(input.fileName);
        const oggBlob = new Blob([new Uint8Array(oggBuffer)], {
          type: "audio/ogg",
        });
        const uploadResult = await uploadWhatsAppMedia(
          phoneNumberId,
          apiKey,
          oggBlob,
          "audio/ogg",
          oggFileName,
        );

        if (!uploadResult.success) {
          return { success: false, error: uploadResult.message };
        }

        const sendResult = await sendWhatsAppMediaMessage(
          phoneNumberId,
          apiKey,
          input.recipientId,
          "audio",
          uploadResult.mediaId,
          { caption: caption || undefined },
        );

        if (!sendResult.success) {
          return { success: false, error: sendResult.message };
        }

        return { success: true, providerMessageId: sendResult.messageId };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to transcode voice note for WhatsApp.";

        return { success: false, error: message };
      }
    }

    const sendResult = await sendWhatsAppMediaMessageByUrl(
      phoneNumberId,
      apiKey,
      input.recipientId,
      input.mediaKind,
      input.mediaUrl,
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
    const connection = await getCachedTelegramDeliveryConnection(
      input.admin,
      input.businessId,
    );

    if (!connection?.bot_token) {
      return { success: false, error: "Telegram is not connected." };
    }

    const botToken = connection.bot_token;

    if (
      needsVoiceNoteTranscode({
        fileName: input.fileName,
        mimeType: input.mimeType,
        kind: input.mediaKind,
      })
    ) {
      try {
        const oggBuffer = await transcodeRemoteVoiceNoteToOggOpus(
          input.mediaUrl,
          input.mimeType,
        );
        const oggFileName = buildVoiceNoteOggFileName(input.fileName);
        const oggBlob = new Blob([new Uint8Array(oggBuffer)], {
          type: "audio/ogg",
        });
        const sendResult = await sendTelegramMediaMessage(
          botToken,
          input.recipientId,
          oggBlob,
          oggFileName,
          "audio/ogg",
          { caption: caption || undefined },
        );

        if (!sendResult.success) {
          return { success: false, error: sendResult.message };
        }

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to transcode voice note for Telegram.";

        return { success: false, error: message };
      }
    }

    const sendResult = await sendTelegramMediaMessageByUrl(
      botToken,
      input.recipientId,
      input.mediaUrl,
      input.mimeType,
      { caption: caption || undefined },
    );

    if (!sendResult.success) {
      return { success: false, error: sendResult.message };
    }

    return { success: true };
  }

  if (input.channel === "whatsapp_web") {
    const result = await sendWhatsAppWebMessage({
      businessId: input.businessId,
      to: input.recipientId,
      text: caption,
      idempotencyKey: input.idempotencyKey,
      media: {
        url: input.mediaUrl,
        mimeType: input.mimeType,
        fileName: input.fileName,
        kind: input.mediaKind,
      },
    });

    if (!result.success) {
      return {
        success: false,
        providerMessageId: result.providerMessageId,
        error: result.error ?? "WhatsApp Web is not connected.",
      };
    }

    return { success: true, providerMessageId: result.providerMessageId };
  }

  if (input.channel === "instagram") {
    return { success: false, error: "Instagram is no longer supported." };
  }

  return { success: false, error: `Unsupported channel: ${input.channel}` };
}
