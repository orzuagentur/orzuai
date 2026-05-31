import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  DEFAULT_WHATSAPP_API_VERSION,
  WHATSAPP_GRAPH_API_BASE,
} from "@/lib/whatsapp/constants";

export function getWhatsAppApiVersion(): string {
  return (
    process.env[ENV_KEYS.WHATSAPP_API_VERSION]?.trim() ||
    DEFAULT_WHATSAPP_API_VERSION
  );
}

export function getWhatsAppVerifyToken(): string | undefined {
  return process.env[ENV_KEYS.WHATSAPP_VERIFY_TOKEN]?.trim() || undefined;
}

export function getWhatsAppAppSecret(): string | undefined {
  return process.env[ENV_KEYS.WHATSAPP_APP_SECRET]?.trim() || undefined;
}

export function buildWhatsAppApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${WHATSAPP_GRAPH_API_BASE}/${getWhatsAppApiVersion()}/${normalizedPath}`;
}

type VerifyCredentialsResult =
  | { success: true; displayPhoneNumber?: string }
  | { success: false; message: string };

export async function verifyWhatsAppCredentials(
  phoneNumberId: string,
  accessToken: string,
): Promise<VerifyCredentialsResult> {
  const response = await fetch(buildWhatsAppApiUrl(phoneNumberId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    return {
      success: false,
      message:
        payload?.error?.message ||
        "Unable to verify WhatsApp credentials with Meta.",
    };
  }

  const payload = (await response.json()) as {
    display_phone_number?: string;
  };

  return {
    success: true,
    displayPhoneNumber: payload.display_phone_number,
  };
}

type SendTextMessageResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<SendTextMessageResult> {
  const response = await fetch(buildWhatsAppApiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { messages?: Array<{ id?: string }>; error?: { message?: string } }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message || "Unable to send WhatsApp message via Meta.",
    };
  }

  const messageId = payload?.messages?.[0]?.id;

  if (!messageId) {
    return {
      success: false,
      message: "Meta accepted the request but did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const appSecret = getWhatsAppAppSecret();

  if (!appSecret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
