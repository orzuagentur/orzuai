import type { WhatsappConnection } from "@/types/database.types";
import type {
  WhatsAppConnectionData,
  WhatsAppWebhookMessage,
  WhatsAppWebhookPayload,
} from "@/types/whatsapp.types";

export function mapWhatsAppConnection(
  connection: WhatsappConnection,
): WhatsAppConnectionData {
  return {
    id: connection.id,
    businessId: connection.business_id,
    phoneNumber: connection.phone_number,
    status: connection.whatsapp_status,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
    createdAt: connection.created_at,
  };
}

export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function canonicalPhoneNumber(value: string): string {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return "";
  }

  return `+${digits}`;
}

export function normalizePhoneNumber(value: string): string {
  const canonical = canonicalPhoneNumber(value);

  if (canonical) {
    return canonical;
  }

  return value.replace(/[^\d+]/g, "");
}

export function parseWhatsAppWebhookPayload(
  payload: WhatsAppWebhookPayload,
): WhatsAppWebhookMessage[] {
  const messages: WhatsAppWebhookMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      if (!phoneNumberId) {
        continue;
      }

      const contactName =
        value?.contacts?.[0]?.profile?.name?.trim() || "WhatsApp Contact";

      for (const message of value?.messages ?? []) {
        if (
          message.type !== "text" ||
          !message.id ||
          !message.from ||
          !message.text?.body
        ) {
          continue;
        }

        messages.push({
          messageId: message.id,
          from: message.from,
          timestamp: message.timestamp ?? new Date().toISOString(),
          body: message.text.body,
          contactName,
          phoneNumberId,
        });
      }
    }
  }

  return messages;
}
