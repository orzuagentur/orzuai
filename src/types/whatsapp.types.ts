import { z } from "zod";

import type { WhatsappStatus } from "./database.types";

export const connectManualWhatsAppSchema = z.object({
  apiKey: z.string().trim().min(1, "360dialog API key is required."),
  phoneNumberId: z
    .string()
    .trim()
    .min(1, "Phone number ID from 360dialog Hub is required."),
  displayPhoneNumber: z.string().trim().min(1).optional(),
});

export const complete360DialogEmbeddedSignupSchema = z.object({
  clientId: z.string().trim().min(1, "360dialog client ID is required."),
  channelIds: z
    .array(z.string().trim().min(1))
    .min(1, "At least one 360dialog channel ID is required."),
});

export type Complete360DialogEmbeddedSignupInput = z.infer<
  typeof complete360DialogEmbeddedSignupSchema
>;

export type ConnectManualWhatsAppInput = z.infer<
  typeof connectManualWhatsAppSchema
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
  | "WEBHOOK_SETUP_FAILED"
  | "CHANNEL_NOT_READY"
  | "PARTNER_NOT_CONFIGURED"
  | "PLAN_LIMIT";

export type WhatsAppActionError = {
  code: WhatsAppErrorCode;
  message: string;
};

export type WhatsAppActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: WhatsAppActionError };

export type ConnectManualWhatsAppResult = WhatsAppActionResult<{
  connection: WhatsAppConnectionData;
}>;

export type Complete360DialogEmbeddedSignupResult = WhatsAppActionResult<{
  connection: WhatsAppConnectionData;
  activationStatus: "connected" | "pending";
}>;

export type Dialog360ApiMode = "production" | "sandbox" | "custom";

export type WhatsAppConnectConfig = {
  isConfigured: boolean;
  webhookUrl: string;
  embeddedSignupEnabled: boolean;
  partnerId?: string;
  integrationsRedirectUrl: string;
  apiMode: Dialog360ApiMode;
  apiBaseUrl: string;
};

export type SyncWhatsAppResult = WhatsAppActionResult<{
  syncedAt: string;
}>;

export type WhatsAppWebhookMessage =
  | {
      kind: "text";
      messageId: string;
      from: string;
      timestamp: string;
      body: string;
      contactName: string;
      phoneNumberId: string;
    }
  | {
      kind: "media";
      messageId: string;
      from: string;
      timestamp: string;
      contactName: string;
      phoneNumberId: string;
      mediaId: string;
      mediaKind: "image" | "audio" | "document" | "video";
      mimeType?: string;
      fileName?: string;
      caption?: string;
    };

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
          display_phone_number?: string;
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
          image?: {
            id?: string;
            caption?: string;
            mime_type?: string;
          };
          audio?: {
            id?: string;
            mime_type?: string;
            voice?: boolean;
          };
          voice?: {
            id?: string;
            mime_type?: string;
          };
          video?: {
            id?: string;
            caption?: string;
            mime_type?: string;
          };
          document?: {
            id?: string;
            caption?: string;
            filename?: string;
            mime_type?: string;
          };
          sticker?: {
            id?: string;
            mime_type?: string;
          };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
        }>;
      };
    }>;
  }>;
};
