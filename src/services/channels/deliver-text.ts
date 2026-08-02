import "server-only";

import { sendTelegramTextMessage } from "@/lib/telegram/client";
import { hasTwilioApiCredentials, sendTwilioSms } from "@/lib/twilio/client";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import {
  getCachedTelegramDeliveryConnection,
  getCachedWhatsAppDeliveryConnection,
} from "@/services/channels/connection-cache";
import { deliverEmailTextMessage, deliverFacebookMessengerTextMessage } from "@/services/channels/deliver-email";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import { isPlatformFeatureAllowed } from "@/services/platform-business-controls.service";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { sendTelegramUserMessage } from "@/services/telegram-user.service";
import { sendWhatsAppWebMessage } from "@/lib/whatsapp-web/worker-client";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
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
      return { success: false, error: "Telegram Bot is not connected." };
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

  if (input.channel === "telegram_user") {
    // Recipient ids are stored as `tg:<chatId>`; the peer is the raw chat id.
    const peer = input.recipientId.replace(/^tg:/, "");
    const userResult = await sendTelegramUserMessage({
      businessId: input.businessId,
      peer,
      message: input.content,
    });

    if (!userResult.success) {
      return {
        success: false,
        error: userResult.message ?? "Personal Telegram is not connected.",
      };
    }

    return {
      success: true,
      providerMessageId:
        userResult.messageId != null ? String(userResult.messageId) : undefined,
    };
  }

  if (input.channel === "whatsapp_web") {
    const result = await sendWhatsAppWebMessage({
      businessId: input.businessId,
      to: input.recipientId,
      text: input.content,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "WhatsApp Web is not connected.",
      };
    }

    return { success: true, providerMessageId: result.providerMessageId };
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

  if (input.channel === "sms") {
    if (!(await isPlatformFeatureAllowed(input.businessId, "sms"))) {
      return { success: false, error: "SMS is disabled for this business." };
    }

    const settings = await getVoiceAgentSettings(input.businessId);
    const from = settings.phoneNumber?.trim();

    if (!settings.smsEnabled || !from) {
      return { success: false, error: "SMS is not configured for this line." };
    }

    const credentials = await resolveTwilioCredentialsForBusiness(
      await getTwilioConnection(input.businessId),
    );

    if (!hasTwilioApiCredentials(credentials)) {
      return { success: false, error: "Twilio credentials missing." };
    }

    try {
      const providerMessageId = await sendTwilioSms({
        credentials,
        from,
        to: input.recipientId,
        body: input.content,
      });

      return { success: true, providerMessageId };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message.slice(0, 200)
            : "Unable to send SMS.",
      };
    }
  }

  if (input.channel === "facebook_messenger") {
    return deliverFacebookMessengerTextMessage();
  }

  return { success: false, error: `Unsupported channel: ${input.channel}` };
}
