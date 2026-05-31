import { z } from "zod";

import type { WhatsappStatus } from "./database.types";

export const connectWhatsAppSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(8, "Enter a valid WhatsApp phone number.")
    .max(20, "Phone number is too long."),
  metaPhoneNumberId: z
    .string()
    .trim()
    .min(3, "WhatsApp Phone Number ID is required.")
    .max(64, "WhatsApp Phone Number ID is too long."),
  metaAccessToken: z
    .string()
    .trim()
    .min(20, "WhatsApp access token is required.")
    .max(4096, "WhatsApp access token is too long."),
});

export const verifyWhatsAppSchema = z.object({
  connectionId: z.string().uuid("Invalid connection identifier."),
  verificationCode: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits.")
    .regex(/^\d{6}$/, "Verification code must contain digits only."),
});

export type ConnectWhatsAppInput = z.infer<typeof connectWhatsAppSchema>;
export type VerifyWhatsAppInput = z.infer<typeof verifyWhatsAppSchema>;

export type WhatsAppConnectionData = {
  id: string;
  businessId: string;
  phoneNumber: string;
  status: WhatsappStatus;
  connectedAt: string | null;
  metaPhoneNumberId: string | null;
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
  | "VERIFY_FAILED"
  | "SYNC_FAILED"
  | "SEND_FAILED"
  | "INVALID_CREDENTIALS"
  | "INVALID_CODE"
  | "CODE_EXPIRED";

export type WhatsAppActionError = {
  code: WhatsAppErrorCode;
  message: string;
};

export type WhatsAppActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: WhatsAppActionError };

export type ConnectWhatsAppResult = WhatsAppActionResult<{
  connection: WhatsAppConnectionData;
  requiresVerification: boolean;
}>;

export type VerifyWhatsAppResult = WhatsAppActionResult<WhatsAppConnectionData>;
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
