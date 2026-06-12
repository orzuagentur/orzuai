import "server-only";

import { getResendClient } from "@/lib/resend/client";
import { hasResendEnv, getResendFromEmail } from "@/lib/env";
import type { ChannelTextDeliveryResult } from "@/services/channels/types";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function deliverEmailTextMessage(input: {
  admin: MessagingDbClient;
  recipientEmail: string;
  subject: string;
  content: string;
}): Promise<ChannelTextDeliveryResult> {
  if (!hasResendEnv()) {
    return { success: false, error: "Email delivery is not configured." };
  }

  const recipient = input.recipientEmail.trim();

  if (!recipient.includes("@")) {
    return { success: false, error: "Recipient email is invalid." };
  }

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: getResendFromEmail(),
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
