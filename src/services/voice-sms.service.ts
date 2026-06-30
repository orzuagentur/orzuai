import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { sendTwilioSms } from "@/lib/twilio/client";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { insertChannelMessage } from "@/services/messaging.service";
import { getMessageRepository } from "@/repositories/message.repository";

export async function handleInboundTwilioSms(input: {
  businessId: string;
  from: string;
  to: string;
  body: string;
  messageSid: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const settings = await getVoiceAgentSettings(input.businessId);

  if (!settings.smsEnabled) {
    return;
  }

  const admin = createAdminClient();
  const phone = input.from.trim();
  const text = input.body.trim();

  if (!phone || !text) {
    return;
  }

  const messageRepo = getMessageRepository(admin);
  const existing = await messageRepo.findByExternalId("voice", input.messageSid);

  if (existing) {
    return;
  }

  const context = await resolveInboundMessageContext(admin, {
    businessId: input.businessId,
    channel: "voice",
    contactName: phone,
    contactPhone: phone,
    identifier: phone,
    displayLabel: phone,
  });

  if (!context) {
    return;
  }

  await insertInboundChannelMessage(admin, {
    conversationId: context.conversationId,
    channel: "voice",
    content: text,
    externalMessageId: input.messageSid,
  });
}

export async function sendVoiceChannelSms(input: {
  businessId: string;
  phoneNumber: string;
  body: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const settings = await getVoiceAgentSettings(input.businessId);

  if (!settings.smsEnabled) {
    return { success: false, message: "SMS is disabled for this line." };
  }

  if (!settings.phoneNumber?.trim()) {
    return { success: false, message: "Business phone number is not configured." };
  }

  const to = input.phoneNumber.trim();
  const body = input.body.trim();

  if (!to || to.length < 8) {
    return { success: false, message: "Invalid phone number." };
  }

  if (!body) {
    return { success: false, message: "Message cannot be empty." };
  }

  const connection = await getTwilioConnection(input.businessId);
  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials?.accountSid || !credentials.authToken) {
    return { success: false, message: "Twilio credentials missing." };
  }

  let messageSid: string;

  try {
    messageSid = await sendTwilioSms({
      credentials,
      from: settings.phoneNumber,
      to,
      body,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Unable to send SMS.",
    };
  }

  const admin = createAdminClient();
  const context = await resolveInboundMessageContext(admin, {
    businessId: input.businessId,
    channel: "voice",
    contactName: to,
    contactPhone: to,
    identifier: to,
    displayLabel: to,
  });

  if (context) {
    await insertChannelMessage(admin, {
      conversationId: context.conversationId,
      channel: "voice",
      senderType: "user",
      content: body,
      externalMessageId: messageSid,
    });
  }

  return { success: true };
}

export function buildSmsWebhookUrl(businessId: string): string {
  return appendTwilioWebhookSignature(
    `${buildAppUrl("/api/webhooks/voice/sms")}?businessId=${businessId}`,
    businessId,
  );
}
