import "server-only";

import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { resolveEmailReplySubjectForConversation } from "@/services/email-reply.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function sendChannelAutoReplyText(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  text: string;
}): Promise<{ success: boolean; error?: string; emailSubject?: string }> {
  const recipientId = await resolveChannelRecipient(input.admin, {
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
  });

  if (!recipientId && input.channel !== "website_forms") {
    return { success: false, error: "Could not resolve channel recipient." };
  }

  const emailSubject =
    input.channel === "email"
      ? await resolveEmailReplySubjectForConversation(
          input.admin,
          input.conversationId,
        )
      : undefined;

  const result = await deliverChannelTextMessage({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    recipientId: recipientId ?? "",
    content: input.text,
    emailSubject,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, emailSubject };
}
