import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { deleteIntegrationSecret } from "@/services/integration-secrets.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import {
  incrementMessagingAnalytics,
  scheduleInboundMessageProcessing,
} from "@/services/messaging.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import type { WhatsAppWebStatus } from "@/types/database.types";
import { getMessagePlainText } from "@/utils/chat-media";
import { canonicalPhoneNumber, phoneDigitsOnly } from "@/utils/whatsapp";

type AdminClient = ReturnType<typeof createAdminClient>;

export type WhatsAppWebConnection = {
  id: string;
  businessId: string;
  status: WhatsAppWebStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  qrExpiresAt: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
};

export type WhatsAppWebActionResult =
  | { success: true; status: WhatsAppWebStatus }
  | { success: false; message: string };

const NO_BUSINESS = "No business found for the current user.";

type ConnectionRow = {
  id: string;
  business_id: string;
  status: WhatsAppWebStatus;
  phone_number: string | null;
  qr_code: string | null;
  qr_expires_at: string | null;
  creds_secret_key_name: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
};

function mapConnection(row: ConnectionRow): WhatsAppWebConnection {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.status,
    phoneNumber: row.phone_number,
    qrCode: row.qr_code,
    qrExpiresAt: row.qr_expires_at,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
  };
}

async function getRowByBusiness(
  admin: AdminClient,
  businessId: string,
): Promise<ConnectionRow | null> {
  const { data } = await admin
    .from("whatsapp_web_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

async function upsertConnection(
  admin: AdminClient,
  businessId: string,
  patch: Partial<Omit<ConnectionRow, "id" | "business_id">>,
): Promise<void> {
  const existing = await getRowByBusiness(admin, businessId);
  const payload = { ...patch, updated_at: new Date().toISOString() };

  if (existing) {
    await admin
      .from("whatsapp_web_connections")
      .update(payload)
      .eq("id", existing.id);
    return;
  }

  await admin
    .from("whatsapp_web_connections")
    .insert({ business_id: businessId, ...payload });
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

/** Public read for UI (RLS-scoped). */
export async function getWhatsAppWebConnection(
  businessId: string,
): Promise<WhatsAppWebConnection | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_web_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapConnection(data as ConnectionRow) : null;
}

/**
 * Owner action: request a fresh QR link. Sets status to `pending_qr` and clears
 * any previous QR/creds so the worker starts a brand-new device pairing.
 */
export async function startWhatsAppWebConnection(): Promise<WhatsAppWebActionResult> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase is not configured." };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const admin = createAdminClient();
  const existing = await getRowByBusiness(admin, businessId);

  // Drop any stale encrypted creds so the pairing starts clean.
  if (existing?.creds_secret_key_name) {
    await deleteIntegrationSecret(admin, existing.creds_secret_key_name);
  }

  await upsertConnection(admin, businessId, {
    status: "pending_qr",
    qr_code: null,
    qr_expires_at: null,
    creds_secret_key_name: null,
    phone_number: null,
    connected_at: null,
  });

  return { success: true, status: "pending_qr" };
}

export async function disconnectWhatsAppWeb(): Promise<WhatsAppWebActionResult> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase is not configured." };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);

  if (row?.creds_secret_key_name) {
    await deleteIntegrationSecret(admin, row.creds_secret_key_name);
  }

  await upsertConnection(admin, businessId, {
    status: "disconnected",
    qr_code: null,
    qr_expires_at: null,
    creds_secret_key_name: null,
    phone_number: null,
    connected_at: null,
    last_synced_at: null,
  });

  return { success: true, status: "disconnected" };
}

export type WhatsAppWebInboundMessage = {
  /** Sender phone number (digits, no domain) or LID JID fallback. */
  from: string;
  /** Raw WhatsApp chat JID used for outbound replies (often `@lid`). */
  chatJid?: string | null;
  externalMessageId: string;
  senderName?: string | null;
  text: string;
  sentAt?: string | null;
};

/**
 * Persists inbound messages received by the personal WhatsApp (Web) client into
 * the inbox under the dedicated `whatsapp_web` channel. Reuses the shared inbound
 * pipeline (contacts, dedup, push, analytics, AI auto-reply).
 */
export async function ingestWhatsAppWebMessages(
  businessId: string,
  messages: WhatsAppWebInboundMessage[],
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv() || messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);

  if (!row || row.status !== "connected") {
    return { processed: 0 };
  }

  let processed = 0;

  for (const message of messages) {
    const content = message.text.trim();
    if (!content) {
      continue;
    }

    const from = message.from.trim();
    const isJid = from.includes("@");
    const digits = isJid ? "" : phoneDigitsOnly(from);

    // Phone digits for normal contacts; full JID (e.g. @lid) when WhatsApp
    // only exposes a Linked ID and no phone mapping yet.
    if (!isJid && !digits) {
      continue;
    }

    const identifier = isJid ? from : digits;
    const contactPhone = isJid
      ? from
      : canonicalPhoneNumber(from) || `+${digits}`;
    const contactName = message.senderName?.trim() || contactPhone;

    const context = await resolveInboundMessageContext(admin, {
      businessId,
      channel: "whatsapp_web",
      contactName,
      contactPhone,
      identifier,
      displayLabel: contactName,
    });

    if (!context) {
      continue;
    }

    const { contactId, conversationId, createdContact } = context;

    const chatJid = message.chatJid?.trim();
    if (chatJid && chatJid.includes("@")) {
      const { data: contactRow } = await admin
        .from("contacts")
        .select("custom_fields")
        .eq("id", contactId)
        .eq("business_id", businessId)
        .maybeSingle();

      const existingFields =
        contactRow?.custom_fields &&
        typeof contactRow.custom_fields === "object" &&
        !Array.isArray(contactRow.custom_fields)
          ? (contactRow.custom_fields as Record<string, unknown>)
          : {};

      if (existingFields.whatsappChatJid !== chatJid) {
        await admin
          .from("contacts")
          .update({
            custom_fields: {
              ...existingFields,
              whatsappChatJid: chatJid,
            } as unknown as Record<string, string>,
          })
          .eq("id", contactId)
          .eq("business_id", businessId);
      }
    }

    const insertResult = await insertInboundChannelMessage(admin, {
      conversationId,
      channel: "whatsapp_web",
      content,
      externalMessageId: message.externalMessageId,
      sentAt: message.sentAt ?? undefined,
    });

    if (!insertResult || insertResult.isDuplicate) {
      continue;
    }

    scheduleInboundMessagePush({
      businessId,
      contactId,
      contactName,
      conversationId,
      channel: "whatsapp_web",
      preview: getMessagePlainText(content),
      isNewContact: createdContact,
    });

    await incrementMessagingAnalytics(admin, businessId, "whatsapp_web", {
      totalMessages: 1,
      totalContacts: createdContact ? 1 : 0,
    });

    await scheduleInboundMessageProcessing({
      admin,
      businessId,
      channel: "whatsapp_web",
      conversationId,
      clientMessage: getMessagePlainText(content),
    });

    processed += 1;
  }

  await admin
    .from("whatsapp_web_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", row.id);

  return { processed };
}
