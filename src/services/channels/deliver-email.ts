import "server-only";

import { sendGmailMessage } from "@/lib/gmail/client";
import { getResendClient } from "@/lib/resend/client";
import { getEmailFromAddress } from "@/lib/email/from-addresses";
import { hasResendEnv } from "@/lib/env";
import { getGmailAccessTokenForBusiness } from "@/services/gmail-integration.service";
import { getOutlookAccessTokenForBusiness } from "@/services/outlook-integration.service";
import { sendOutlookMessage } from "@/lib/outlook/client";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function deliverOutlookTextMessage(input: {
  businessId: string;
  recipientEmail: string;
  subject: string;
  content: string;
  idempotencyKey?: string;
}): Promise<ChannelTextDeliveryResult> {
  const recipient = input.recipientEmail.trim().toLowerCase();

  if (!recipient.includes("@")) {
    return { success: false, error: "Recipient email is invalid." };
  }

  const outlook = await getOutlookAccessTokenForBusiness(input.businessId);

  if (!outlook) {
    return { success: false, error: "Outlook is not connected." };
  }

  const sendResult = await sendOutlookMessage({
    accessToken: outlook.accessToken,
    toEmail: recipient,
    subject: input.subject,
    body: input.content,
    idempotencyKey: input.idempotencyKey,
  });

  if (!sendResult.success) {
    return {
      success: false,
      error: sendResult.error ?? "Outlook send failed.",
    };
  }

  return { success: true, providerMessageId: sendResult.messageId };
}

export async function deliverEmailTextMessage(input: {
  admin: MessagingDbClient;
  businessId: string;
  recipientEmail: string;
  subject: string;
  content: string;
}): Promise<ChannelTextDeliveryResult> {
  const recipient = input.recipientEmail.trim().toLowerCase();

  if (!recipient.includes("@")) {
    return { success: false, error: "Recipient email is invalid." };
  }

  const gmail = await getGmailAccessTokenForBusiness(input.businessId);

  if (gmail) {
    const sendResult = await sendGmailMessage({
      accessToken: gmail.accessToken,
      fromEmail: gmail.fromEmail,
      toEmail: recipient,
      subject: input.subject,
      body: input.content,
    });

    if (!sendResult.success) {
      return { success: false, error: sendResult.error ?? "Gmail send failed." };
    }

    return { success: true, providerMessageId: sendResult.messageId };
  }

  if (!hasResendEnv()) {
    return {
      success: false,
      error:
        "Gmail is not connected and email delivery is not configured.",
    };
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getEmailFromAddress("lead_follow_up"),
      to: recipient,
      subject: input.subject,
      text: input.content,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

export async function deliverFacebookMessengerTextMessage(): Promise<ChannelTextDeliveryResult> {
  return {
    success: false,
    error: "Facebook Messenger is not connected. Connect it in Integrations.",
  };
}
