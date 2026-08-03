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

function defaultProtocolForWorkerUrl(value: string): "http" | "https" {
  const host = value.split(/[/?#]/, 1)[0]?.toLowerCase() ?? "";

  if (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.startsWith("127.") ||
    host.startsWith("0.0.0.0") ||
    host.startsWith("[::1]")
  ) {
    return "http";
  }

  return "https";
}

export function normalizeWhatsAppWebWorkerUrl(
  rawUrl: string | null | undefined,
): string | null {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `${defaultProtocolForWorkerUrl(trimmed)}://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function isWhatsAppWebWorkerConfigured(): boolean {
  return Boolean(
    normalizeWhatsAppWebWorkerUrl(
      process.env[ENV_KEYS.WHATSAPP_WEB_WORKER_URL],
    ) &&
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
  const rawBase = process.env[ENV_KEYS.WHATSAPP_WEB_WORKER_URL]?.trim();
  const base = normalizeWhatsAppWebWorkerUrl(rawBase);
  const secret = process.env[ENV_KEYS.WHATSAPP_WEB_SECRET]?.trim();

  if (!rawBase || !secret) {
    return { success: false, error: "WhatsApp Web is not connected." };
  }

  if (!base) {
    return { success: false, error: "WhatsApp Web worker URL is invalid." };
  }

  try {
    const response = await fetch(`${base}/send`, {
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
