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

  if (!message?.text?.trim() || message.from?.is_bot) {
    return [];
  }

  const chatId = String(message.chat.id);

  return [
    {
      chatId,
      body: message.text.trim(),
      contactName: buildContactName(message.from ?? {}),
    },
  ];
}
