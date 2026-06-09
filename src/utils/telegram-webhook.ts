import type {
  TelegramInboundMessage,
  TelegramWebhookPayload,
} from "@/types/telegram.types";

function buildContactName(from: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string {
  const parts = [from.first_name, from.last_name].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  if (from.username) {
    return `@${from.username}`;
  }

  return "Telegram user";
}

export function parseTelegramWebhookPayload(
  payload: TelegramWebhookPayload,
): TelegramInboundMessage[] {
  const message = payload.message ?? payload.edited_message;

  if (!message || message.from?.is_bot) {
    return [];
  }

  const chatId = String(message.chat.id);
  const contactName = buildContactName(message.from ?? {});

  if (message.text?.trim()) {
    return [
      {
        kind: "text",
        chatId,
        body: message.text.trim(),
        contactName,
      },
    ];
  }

  if (message.photo?.length) {
    const largest = message.photo[message.photo.length - 1];

    if (!largest?.file_id) {
      return [];
    }

    return [
      {
        kind: "media",
        chatId,
        contactName,
        fileId: largest.file_id,
        mediaKind: "image",
        mimeType: "image/jpeg",
        fileName: "photo.jpg",
        caption: message.caption?.trim(),
      },
    ];
  }

  if (message.voice?.file_id) {
    return [
      {
        kind: "media",
        chatId,
        contactName,
        fileId: message.voice.file_id,
        mediaKind: "audio",
        mimeType: message.voice.mime_type || "audio/ogg",
        fileName: "voice.ogg",
        caption: message.caption?.trim(),
      },
    ];
  }

  if (message.video?.file_id) {
    return [
      {
        kind: "media",
        chatId,
        contactName,
        fileId: message.video.file_id,
        mediaKind: "video",
        mimeType: message.video.mime_type || "video/mp4",
        fileName: "video.mp4",
        caption: message.caption?.trim(),
      },
    ];
  }

  if (message.audio?.file_id) {
    return [
      {
        kind: "media",
        chatId,
        contactName,
        fileId: message.audio.file_id,
        mediaKind: "audio",
        mimeType: message.audio.mime_type || "audio/mpeg",
        fileName: message.audio.file_name || "audio",
        caption: message.caption?.trim(),
      },
    ];
  }

  if (message.document?.file_id) {
    return [
      {
        kind: "media",
        chatId,
        contactName,
        fileId: message.document.file_id,
        mediaKind: "document",
        mimeType: message.document.mime_type || "application/octet-stream",
        fileName: message.document.file_name || "document",
        caption: message.caption?.trim(),
      },
    ];
  }

  return [];
}
