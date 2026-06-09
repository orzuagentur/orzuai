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

function buildWhatsAppMediaMessage(
  message: {
    id?: string;
    from?: string;
    timestamp?: string;
  },
  contactName: string,
  phoneNumberId: string,
  mediaKind: "image" | "audio" | "document" | "video",
  mediaId: string,
  options?: {
    mimeType?: string;
    fileName?: string;
    caption?: string;
  },
): WhatsAppWebhookMessage | null {
  if (!message.id || !message.from) {
    return null;
  }

  return {
    kind: "media",
    messageId: message.id,
    from: message.from,
    timestamp: message.timestamp ?? new Date().toISOString(),
    contactName,
    phoneNumberId,
    mediaId,
    mediaKind,
    mimeType: options?.mimeType,
    fileName: options?.fileName,
    caption: options?.caption,
  };
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
        if (!message.id || !message.from) {
          continue;
        }

        if (message.type === "text" && message.text?.body) {
          messages.push({
            kind: "text",
            messageId: message.id,
            from: message.from,
            timestamp: message.timestamp ?? new Date().toISOString(),
            body: message.text.body,
            contactName,
            phoneNumberId,
          });
          continue;
        }

        if (message.type === "image" && message.image?.id) {
          const parsed = buildWhatsAppMediaMessage(
            message,
            contactName,
            phoneNumberId,
            "image",
            message.image.id,
            {
              mimeType: message.image.mime_type,
              caption: message.image.caption,
              fileName: "image",
            },
          );

          if (parsed) {
            messages.push(parsed);
          }
          continue;
        }

        if (
          (message.type === "audio" && message.audio?.id) ||
          (message.type === "voice" && message.voice?.id)
        ) {
          const audioId = message.audio?.id ?? message.voice?.id;
          const audioMime =
            message.audio?.mime_type ?? message.voice?.mime_type;

          if (audioId) {
            const parsed = buildWhatsAppMediaMessage(
              message,
              contactName,
              phoneNumberId,
              "audio",
              audioId,
              {
                mimeType: audioMime,
                fileName: "voice-message",
              },
            );

            if (parsed) {
              messages.push(parsed);
            }
          }
          continue;
        }

        if (message.type === "video" && message.video?.id) {
          const parsed = buildWhatsAppMediaMessage(
            message,
            contactName,
            phoneNumberId,
            "video",
            message.video.id,
            {
              mimeType: message.video.mime_type,
              caption: message.video.caption,
              fileName: "video",
            },
          );

          if (parsed) {
            messages.push(parsed);
          }
          continue;
        }

        if (message.type === "document" && message.document?.id) {
          const parsed = buildWhatsAppMediaMessage(
            message,
            contactName,
            phoneNumberId,
            "document",
            message.document.id,
            {
              mimeType: message.document.mime_type,
              caption: message.document.caption,
              fileName: message.document.filename || "document",
            },
          );

          if (parsed) {
            messages.push(parsed);
          }
          continue;
        }

        if (message.type === "sticker" && message.sticker?.id) {
          const parsed = buildWhatsAppMediaMessage(
            message,
            contactName,
            phoneNumberId,
            "image",
            message.sticker.id,
            {
              mimeType: message.sticker.mime_type,
              fileName: "sticker",
            },
          );

          if (parsed) {
            messages.push(parsed);
          }
        }
      }
    }
  }

  return messages;
}
