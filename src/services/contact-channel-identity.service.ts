import "server-only";

import {
  toChannelExternalId,
  toLegacyContactPhoneNumber,
  whatsappPhoneVariants,
} from "@/services/channels/contact-identity";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function syncContactChannelIdentity(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    contactId: string;
    channel: MessagingChannel;
    identifier: string;
    displayLabel?: string | null;
  },
): Promise<void> {
  const externalId = toChannelExternalId(input.channel, input.identifier);

  if (!externalId) {
    return;
  }

  const { error } = await admin.from("contact_channel_identities").upsert(
    {
      business_id: input.businessId,
      contact_id: input.contactId,
      channel: input.channel,
      external_id: externalId,
      display_label: input.displayLabel?.trim() || null,
    },
    { onConflict: "business_id,channel,external_id" },
  );

  if (error) {
    console.error("[contact-identity] sync failed", error.message);
  }
}

export async function findContactIdByChannelIdentity(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  identifier: string,
): Promise<string | null> {
  const externalId = toChannelExternalId(channel, identifier);

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("contact_id")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();

  return identity?.contact_id ?? null;
}

export async function findContactForChannelWithIdentities(
  admin: MessagingDbClient,
  businessId: string,
  channel: MessagingChannel,
  identifier: string,
): Promise<{ id: string } | null> {
  const identityContactId = await findContactIdByChannelIdentity(
    admin,
    businessId,
    channel,
    identifier,
  );

  if (identityContactId) {
    return { id: identityContactId };
  }

  if (channel === "whatsapp") {
    const variants = whatsappPhoneVariants(identifier);

    for (const phoneNumber of variants) {
      const { data } = await admin
        .from("contacts")
        .select("id")
        .eq("business_id", businessId)
        .eq("channel", channel)
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (data?.id) {
        return { id: data.id };
      }
    }

    return null;
  }

  const legacyPhone = toLegacyContactPhoneNumber(
    channel,
    toChannelExternalId(channel, identifier),
  );
  const identifiers = [...new Set([identifier, legacyPhone])];

  for (const phoneNumber of identifiers) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (data?.id) {
      return { id: data.id };
    }
  }

  return null;
}
