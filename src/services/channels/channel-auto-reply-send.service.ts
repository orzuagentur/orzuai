import "server-only";

import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { resolveEmailReplySubjectForConversation } from "@/services/email-reply.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import { sanitizeCustomerFacingReply } from "@/utils/customer-facing-reply-guard";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function sendChannelAutoReplyText(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  text: string;
}): Promise<{
  success: boolean;
  error?: string;
  emailSubject?: string;
  sentText?: string;
}> {
  const safeText = sanitizeCustomerFacingReply(input.text);

  if (!safeText.text) {
    return { success: false, error: "Unsafe customer reply was blocked." };
  }

  if (safeText.blocked) {
    console.warn(
      "[channel-auto-reply-send] blocked unsafe customer text",
      JSON.stringify({
        businessId: input.businessId,
        channel: input.channel,
        conversationId: input.conversationId,
        reason: safeText.reason,
      }),
    );
  }

  const recipientId = await resolveChannelRecipient(input.admin, {
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
  });

  if (!recipientId && input.channel !== "website_forms") {
    return { success: false, error: "Could not resolve channel recipient." };
  }

  const emailSubject =
    input.channel === "email" || input.channel === "outlook"
      ? await resolveEmailReplySubjectForConversation(
          input.admin,
          input.conversationId,
          input.channel,
        )
      : undefined;

  const result = await deliverChannelTextMessage({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    recipientId: recipientId ?? "",
    content: safeText.text,
    emailSubject,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, emailSubject, sentText: safeText.text };
}
