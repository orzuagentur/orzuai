import { z } from "zod";

import type { TelegramStatus } from "./database.types";

export type TelegramConnectionData = {
  id: string;
  businessId: string;
  botUsername: string;
  status: TelegramStatus;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type TelegramConnectConfig = {
  isConfigured: boolean;
  webhookBaseUrl: string;
};

export type TelegramErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "NO_BUSINESS"
  | "NOT_FOUND"
  | "ALREADY_CONNECTED"
  | "CONNECT_FAILED"
  | "INVALID_TOKEN"
  | "WEBHOOK_FAILED";

export type TelegramActionError = {
  code: TelegramErrorCode;
  message: string;
};

export type TelegramActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: TelegramActionError };

export const telegramConnectSchema = z.object({
  botToken: z
    .string()
    .trim()
    .min(1, "Bot token is required.")
    .regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid Telegram bot token format."),
});

export type TelegramConnectInput = z.infer<typeof telegramConnectSchema>;

export type ConnectTelegramBotResult = TelegramActionResult<{
  connection: TelegramConnectionData;
}>;

export type TelegramWebhookPayload = {
  update_id?: number;
  message?: TelegramWebhookMessage;
  edited_message?: TelegramWebhookMessage;
};

type TelegramWebhookMessage = {
  message_id?: number;
  text?: string;
  from?: {
    id?: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type?: string;
  };
};

export type TelegramInboundMessage = {
  chatId: string;
  body: string;
  contactName: string;
};
