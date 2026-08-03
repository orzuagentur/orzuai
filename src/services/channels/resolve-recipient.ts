import "server-only";

import { toChannelExternalId } from "@/services/channels/contact-identity";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function resolveChannelRecipient(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    conversationId: string;
    channel: MessagingChannel;
  },
): Promise<string | null> {
  const { data: conversation } = await admin
    .from("conversations")
    .select("contact_id, contact:contacts(phone_number, email, custom_fields)")
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const contact = Array.isArray(conversation?.contact)
    ? conversation.contact[0]
    : conversation?.contact;

  if (input.channel === "email") {
    const email = contact?.email?.trim().toLowerCase();

    if (email) {
      return email;
    }

    if (contact?.phone_number?.includes("@")) {
      return toChannelExternalId("email", contact.phone_number);
    }

    return null;
  }

  if (!contact?.phone_number) {
    return null;
  }

  if (input.channel === "website_forms") {
    return contact.phone_number;
  }

  // For WhatsApp Web, prefer the phone number. Baileys routes PN JIDs more
  // reliably than raw @lid addresses from inbound packets.
  const externalId = toChannelExternalId(input.channel, contact.phone_number);

  if (conversation?.contact_id) {
    const { data: identity } = await admin
      .from("contact_channel_identities")
      .select("external_id")
      .eq("business_id", input.businessId)
      .eq("contact_id", conversation.contact_id)
      .eq("channel", input.channel)
      .maybeSingle();

    if (identity?.external_id) {
      return identity.external_id;
    }
  }

  return externalId;
}
