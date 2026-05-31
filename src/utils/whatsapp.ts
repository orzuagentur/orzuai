import { createHash, randomInt } from "crypto";

import type { WhatsappConnection } from "@/types/database.types";
import type {
  WhatsAppConnectionData,
  WhatsAppWebhookMessage,
  WhatsAppWebhookPayload,
} from "@/types/whatsapp.types";
import { WHATSAPP_VERIFICATION_CODE_LENGTH } from "@/lib/whatsapp/constants";

export function mapWhatsAppConnection(
  connection: WhatsappConnection,
): WhatsAppConnectionData {
  return {
    id: connection.id,
    businessId: connection.business_id,
    phoneNumber: connection.phone_number,
    status: connection.whatsapp_status,
    connectedAt: connection.connected_at,
    metaPhoneNumberId: connection.meta_phone_number_id,
    lastSyncedAt: connection.last_synced_at,
    createdAt: connection.created_at,
  };
}

export function normalizePhoneNumber(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function generateVerificationCode(): string {
  const max = 10 ** WHATSAPP_VERIFICATION_CODE_LENGTH;
  const min = 10 ** (WHATSAPP_VERIFICATION_CODE_LENGTH - 1);
  return String(randomInt(min, max));
}

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
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

export function buildVerificationMessage(code: string): string {
  return `Your OrzuAI verification code is ${code}. It expires in 10 minutes.`;
}
