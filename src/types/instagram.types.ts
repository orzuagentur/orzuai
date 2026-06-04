import { z } from "zod";

import type { InstagramStatus } from "./database.types";

export type InstagramConnectionData = {
  id: string;
  businessId: string;
  username: string;
  status: InstagramStatus;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type InstagramEmbeddedSignupConfig = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  isConfigured: boolean;
};

export const connectManualInstagramSchema = z.object({
  pageId: z.string().trim().min(1, "Facebook Page ID is required."),
  accessToken: z
    .string()
    .trim()
    .min(1, "Page access token is required."),
  igUserId: z.string().trim().min(1).optional(),
  businessAccountId: z.string().trim().min(1).optional(),
});

export type ConnectManualInstagramInput = z.infer<
  typeof connectManualInstagramSchema
>;

export type InstagramConnectConfig = {
  isConfigured: boolean;
  webhookUrl: string;
};

export const completeInstagramEmbeddedSignupSchema = z.object({
  code: z.string().trim().min(1, "Meta authorization code is required."),
  pageId: z.string().trim().min(1, "Facebook Page ID is required."),
  igUserId: z.string().trim().min(1, "Instagram account ID is required."),
  businessAccountId: z.string().trim().min(1).optional(),
  finishEvent: z.string().trim().min(1, "Embedded Signup event is missing."),
});

export type CompleteInstagramEmbeddedSignupInput = z.infer<
  typeof completeInstagramEmbeddedSignupSchema
>;

export type InstagramErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "NO_BUSINESS"
  | "NOT_FOUND"
  | "ALREADY_CONNECTED"
  | "CONNECT_FAILED"
  | "SYNC_FAILED"
  | "INVALID_CREDENTIALS"
  | "SIGNUP_CANCELLED"
  | "SIGNUP_INCOMPLETE"
  | "TOKEN_EXCHANGE_FAILED"
  | "SUBSCRIBE_FAILED"
  | "SEND_FAILED";

export type InstagramActionError = {
  code: InstagramErrorCode;
  message: string;
};

export type InstagramActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InstagramActionError };

export type CompleteInstagramEmbeddedSignupResult = InstagramActionResult<{
  connection: InstagramConnectionData;
}>;

export type ConnectManualInstagramResult = InstagramActionResult<{
  connection: InstagramConnectionData;
}>;

export type InstagramWebhookMessage = {
  messageId: string;
  from: string;
  timestamp: string;
  body: string;
  contactName: string;
  pageId: string;
};

export type InstagramWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
      };
    }>;
  }>;
};
