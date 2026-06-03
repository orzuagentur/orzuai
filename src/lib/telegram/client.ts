import { timingSafeEqual } from "crypto";

import { TELEGRAM_API_BASE } from "@/lib/telegram/constants";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramBotInfo = {
  id: number;
  username: string;
  first_name: string;
};

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ success: true; result: T } | { success: false; message: string }> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | TelegramApiResponse<T>
    | null;

  if (!response.ok || !payload?.ok || payload.result === undefined) {
    return {
      success: false,
      message: payload?.description ?? "Telegram API request failed.",
    };
  }

  return { success: true, result: payload.result };
}

export async function getTelegramBotInfo(
  botToken: string,
): Promise<{ success: true; bot: TelegramBotInfo } | { success: false; message: string }> {
  const result = await callTelegramApi<TelegramBotInfo>(botToken, "getMe");

  if (!result.success) {
    return result;
  }

  return { success: true, bot: result.result };
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const result = await callTelegramApi<boolean>(botToken, "setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  if (!result.success) {
    return result;
  }

  return { success: true };
}

export async function sendTelegramTextMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const result = await callTelegramApi<{ message_id: number }>(
    botToken,
    "sendMessage",
    {
      chat_id: chatId,
      text,
    },
  );

  if (!result.success) {
    return result;
  }

  return { success: true };
}

export function verifyTelegramWebhookSecret(
  headerValue: string | null,
  expectedSecret: string,
): boolean {
  if (!headerValue || !expectedSecret) {
    return false;
  }

  const received = Buffer.from(headerValue);
  const expected = Buffer.from(expectedSecret);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}
