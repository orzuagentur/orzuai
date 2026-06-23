import "server-only";

import { toChannelExternalId } from "@/services/channels/contact-identity";
import type { InsertedChannelMessageRow } from "@/services/messaging.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";
import { formatEmailListPreview } from "@/utils/email-message";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export type InboundMessageContext = {
  contactId: string;
  conversationId: string;
  createdContact: boolean;
};

type ResolveInboundMessageContextInput = {
  businessId: string;
  channel: MessagingChannel;
  contactName: string;
  /** Value stored on contacts.phone_number (e.g. tg:123, +1555, ig:user). */
  contactPhone: string;
  /** Raw channel identifier before normalization. */
  identifier: string;
  displayLabel?: string | null;
};

type InsertInboundChannelMessageInput = {
  conversationId: string;
  channel: MessagingChannel;
  content: string;
  emailSubject?: string | null;
  externalMessageId?: string | null;
};

export type InsertInboundChannelMessageResult = {
  message: InsertedChannelMessageRow;
  isDuplicate: boolean;
};

export async function resolveInboundMessageContext(
  admin: MessagingDbClient,
  input: ResolveInboundMessageContextInput,
): Promise<InboundMessageContext | null> {
  const externalId = toChannelExternalId(input.channel, input.identifier);

  if (!externalId) {
    return null;
  }

  const { data, error } = await admin.rpc("resolve_inbound_message_context", {
    p_business_id: input.businessId,
    p_channel: input.channel,
    p_contact_name: input.contactName,
    p_contact_phone: input.contactPhone,
    p_external_id: externalId,
    p_display_label: input.displayLabel ?? input.contactName,
  });

  if (error) {
    throw error;
  }

  const row = data?.[0];

  if (!row?.contact_id || !row.conversation_id) {
    return null;
  }

  return {
    contactId: row.contact_id,
    conversationId: row.conversation_id,
    createdContact: row.created_contact ?? false,
  };
}

export async function insertInboundChannelMessage(
  admin: MessagingDbClient,
  input: InsertInboundChannelMessageInput,
): Promise<InsertInboundChannelMessageResult | null> {
  const preview =
    input.channel === "email"
      ? formatEmailListPreview(
          input.emailSubject ?? null,
          input.content,
        )
      : getMessagePreviewText(input.content);

  const { data, error } = await admin.rpc("insert_inbound_channel_message", {
    p_conversation_id: input.conversationId,
    p_channel: input.channel,
    p_sender_type: "client",
    p_content: input.content,
    p_external_message_id: input.externalMessageId ?? undefined,
    p_message_preview: preview,
    p_email_subject: input.emailSubject ?? undefined,
  });

  if (error) {
    throw error;
  }

  const row = data?.[0];

  if (!row?.id) {
    return null;
  }

  return {
    message: {
      id: row.id,
      conversation_id: row.conversation_id,
      channel: row.channel,
      sender_type: row.sender_type,
      content: row.content,
      ai_generated: row.ai_generated,
      created_at: row.created_at,
      external_message_id: row.external_message_id,
    },
    isDuplicate: row.is_duplicate ?? false,
  };
}
