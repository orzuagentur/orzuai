import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";

export type WhatsAppWebWorkerSendInput = {
  businessId: string;
  to: string;
  text: string;
  media?: {
    url: string;
    mimeType: string;
    fileName: string;
    kind: string;
  } | null;
};

export type WhatsAppWebWorkerSendResult = {
  success: boolean;
  providerMessageId?: string;
  error?: string;
};

export function isWhatsAppWebWorkerConfigured(): boolean {
  return Boolean(
    process.env[ENV_KEYS.WHATSAPP_WEB_WORKER_URL]?.trim() &&
      process.env[ENV_KEYS.WHATSAPP_WEB_SECRET]?.trim(),
  );
}

/**
 * Sends an outbound message through the WhatsApp Web worker (which holds the
 * live Baileys socket). Returns a structured result so the delivery pipeline can
 * record success/failure and retry.
 */
export async function sendWhatsAppWebMessage(
  input: WhatsAppWebWorkerSendInput,
): Promise<WhatsAppWebWorkerSendResult> {
  const base = process.env[ENV_KEYS.WHATSAPP_WEB_WORKER_URL]?.trim();
  const secret = process.env[ENV_KEYS.WHATSAPP_WEB_SECRET]?.trim();

  if (!base || !secret) {
    return { success: false, error: "WhatsApp Web is not connected." };
  }

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-userbot-secret": secret,
      },
      body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      providerMessageId?: string;
      error?: string;
    };

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error ?? `WhatsApp Web worker responded ${response.status}.`,
      };
    }

    return { success: true, providerMessageId: data.providerMessageId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "WhatsApp Web worker is unreachable.",
    };
  }
}
