import "server-only";

import { revalidatePath } from "next/cache";
import { promises as dns } from "dns";
import { z } from "zod";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  OUTBOUND_ADD_CONTACT_CHANNELS,
  type OutboundAddContactChannel,
} from "@/features/chats/outbound-contact";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { toChannelExternalId } from "@/services/channels/contact-identity";
import { getGmailConnection } from "@/services/gmail-integration.service";
import { resolveInboundMessageContext } from "@/services/inbound-ingest.service";
import type { MessagingChannel } from "@/types/database.types";

const verifyInputSchema = z.object({
  channel: z.enum(OUTBOUND_ADD_CONTACT_CHANNELS),
  identifier: z.string().trim().min(1).max(320),
  contactName: z.string().trim().max(120).optional(),
});

const startInputSchema = z.object({
  verifiedToken: z.string().min(8).max(512),
});

type VerifiedContactPayload = {
  channel: OutboundAddContactChannel;
  identifier: string;
  contactName?: string;
  displayLabel?: string;
};

function encodeVerifiedToken(payload: VerifiedContactPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeVerifiedToken(token: string): VerifiedContactPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as VerifiedContactPayload;

    if (
      !parsed?.channel ||
      !OUTBOUND_ADD_CONTACT_CHANNELS.includes(parsed.channel) ||
      !parsed.identifier?.trim()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function revalidateInboxPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function verifyEmailDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim();

  if (!domain) {
    return false;
  }

  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function listConnectedAddContactChannels(): Promise<
  OutboundAddContactChannel[]
> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return [];
  }

  const gmail = await getGmailConnection(businessId);

  if (gmail?.status === "connected" && gmail.gmailAddress) {
    return ["email"];
  }

  return [];
}

export async function verifyOutboundContact(input: {
  channel: OutboundAddContactChannel;
  identifier: string;
  contactName?: string;
}): Promise<
  | {
      success: true;
      verifiedToken: string;
      displayLabel: string;
      message: string;
    }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: CHAT_MESSAGES.missingConfig };
  }

  const parsed = verifyInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: CHAT_MESSAGES.noBusinessDescription };
  }

  const { channel, identifier, contactName } = parsed.data;
  const emailParsed = z.string().email().safeParse(identifier.trim().toLowerCase());

  if (!emailParsed.success) {
    return { success: false, message: CHAT_MESSAGES.addContactInvalidEmail };
  }

  const email = emailParsed.data;
  const gmail = await getGmailConnection(businessId);

  if (gmail?.status !== "connected" || !gmail.gmailAddress) {
    return { success: false, message: CHAT_MESSAGES.emailNotConnected };
  }

  if (email === gmail.gmailAddress.toLowerCase()) {
    return { success: false, message: CHAT_MESSAGES.addContactOwnEmail };
  }

  const domainValid = await verifyEmailDomain(email);

  if (!domainValid) {
    return { success: false, message: CHAT_MESSAGES.addContactEmailDomainInvalid };
  }

  const payload: VerifiedContactPayload = {
    channel,
    identifier: email,
    contactName: contactName?.trim() || email,
    displayLabel: email,
  };

  return {
    success: true,
    verifiedToken: encodeVerifiedToken(payload),
    displayLabel: email,
    message: CHAT_MESSAGES.addContactVerifySuccess,
  };
}

export async function startOutboundConversation(input: {
  verifiedToken: string;
}): Promise<
  | { success: true; conversationId: string; channel: MessagingChannel }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: CHAT_MESSAGES.missingConfig };
  }

  const parsed = startInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
    };
  }

  const verified = decodeVerifiedToken(parsed.data.verifiedToken);

  if (!verified) {
    return { success: false, message: CHAT_MESSAGES.addContactVerifyRequired };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: CHAT_MESSAGES.noBusinessDescription };
  }

  const admin = createAdminClient();
  const channel = verified.channel;
  const externalId = toChannelExternalId(channel, verified.identifier);
  const contactName =
    verified.contactName?.trim() ||
    verified.displayLabel ||
    verified.identifier;
  const contactPhone = verified.identifier.toLowerCase();

  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel,
    contactName,
    contactPhone,
    identifier: externalId,
    displayLabel: verified.displayLabel ?? contactName,
  });

  if (!context) {
    return { success: false, message: CHAT_MESSAGES.genericError };
  }

  await admin
    .from("contacts")
    .update({ email: verified.identifier.toLowerCase() })
    .eq("id", context.contactId)
    .is("email", null);

  revalidateInboxPaths();

  return {
    success: true,
    conversationId: context.conversationId,
    channel,
  };
}
