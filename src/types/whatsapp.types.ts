import { z } from "zod";

import type { WhatsappStatus } from "./database.types";

export const connectManualWhatsAppSchema = z.object({
  phoneNumberId: z
    .string()
    .trim()
    .min(1, "WhatsApp Phone Number ID is required."),
  wabaId: z
    .string()
    .trim()
    .min(1, "WhatsApp Business Account ID is required."),
  accessToken: z
    .string()
    .trim()
    .min(1, "Permanent access token is required."),
  businessAccountId: z.string().trim().min(1).optional(),
});

export type ConnectManualWhatsAppInput = z.infer<
  typeof connectManualWhatsAppSchema
>;

export const completeEmbeddedSignupSchema = z.object({
  code: z.string().trim().min(1, "Meta authorization code is required."),
  phoneNumberId: z.string().trim().min(1, "WhatsApp phone number ID is missing."),
  wabaId: z.string().trim().min(1, "WhatsApp Business Account ID is missing."),
  businessAccountId: z.string().trim().min(1).optional(),
  finishEvent: z.string().trim().min(1, "Embedded Signup event is missing."),
});

export type CompleteEmbeddedSignupInput = z.infer<
  typeof completeEmbeddedSignupSchema
>;

export type WhatsAppConnectionData = {
  id: string;
  businessId: string;
  phoneNumber: string;
  status: WhatsappStatus;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type WhatsAppErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "NO_BUSINESS"
  | "NOT_FOUND"
  | "ALREADY_CONNECTED"
  | "CONNECT_FAILED"
  | "SYNC_FAILED"
  | "SEND_FAILED"
  | "INVALID_CREDENTIALS"
  | "SIGNUP_CANCELLED"
  | "SIGNUP_INCOMPLETE"
  | "TOKEN_EXCHANGE_FAILED"
  | "SUBSCRIBE_FAILED";

export type WhatsAppActionError = {
  code: WhatsAppErrorCode;
  message: string;
};

export type WhatsAppActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: WhatsAppActionError };

export type CompleteEmbeddedSignupResult = WhatsAppActionResult<{
  connection: WhatsAppConnectionData;
}>;

export type ConnectManualWhatsAppResult = WhatsAppActionResult<{
  connection: WhatsAppConnectionData;
}>;

export type WhatsAppConnectConfig = {
  isConfigured: boolean;
  webhookUrl: string;
};

export type SyncWhatsAppResult = WhatsAppActionResult<{
  syncedAt: string;
}>;

export type WhatsAppWebhookMessage = {
  messageId: string;
  from: string;
  timestamp: string;
  body: string;
  contactName: string;
  phoneNumberId: string;
};

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: {
            name?: string;
          };
          wa_id?: string;
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
};

export type WhatsAppEmbeddedSignupConfig = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  isConfigured: boolean;
};
