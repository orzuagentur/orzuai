import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { getDialog360ApiBase, isDialog360SandboxMode } from "@/lib/whatsapp/constants";

function buildDialog360Url(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getDialog360ApiBase()}${normalizedPath}`;
}

function dialog360Headers(apiKey: string, json = true): HeadersInit {
  const headers: Record<string, string> = {
    "D360-API-KEY": apiKey,
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

type ApiResult<T> = { success: true; data: T } | { success: false; message: string };

type VerifyCredentialsResult =
  | { success: true; displayPhoneNumber?: string }
  | { success: false; message: string };

export async function verify360DialogApiKey(
  apiKey: string,
): Promise<VerifyCredentialsResult> {
  const verifyPath = isDialog360SandboxMode()
    ? "/v1/configs/webhook"
    : "/health";

  const response = await fetch(buildDialog360Url(verifyPath), {
    headers: dialog360Headers(apiKey, false),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string; detail?: string }
      | null;

    return {
      success: false,
      message:
        payload?.detail ||
        payload?.error ||
        payload?.message ||
        (isDialog360SandboxMode()
          ? "360dialog sandbox rejected this API key. Send START to +551146733492 on WhatsApp to get a sandbox key."
          : "360dialog rejected this API key. Generate a new key in the 360dialog Hub."),
    };
  }

  return { success: true };
}

export async function verifyWhatsAppCredentials(
  _phoneNumberId: string,
  apiKey: string,
): Promise<VerifyCredentialsResult> {
  return verify360DialogApiKey(apiKey);
}

export async function set360DialogWebhook(
  apiKey: string,
  webhookUrl: string,
): Promise<ApiResult<{ url: string }>> {
  const response = await fetch(buildDialog360Url("/v1/configs/webhook"), {
    method: "POST",
    headers: dialog360Headers(apiKey),
    body: JSON.stringify({ url: webhookUrl }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { url?: string; error?: string; message?: string }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error ||
        payload?.message ||
        "Unable to register the webhook URL with 360dialog.",
    };
  }

  return {
    success: true,
    data: { url: payload?.url ?? webhookUrl },
  };
}

type SendTextMessageResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

export async function sendWhatsAppTextMessage(
  _phoneNumberId: string,
  apiKey: string,
  to: string,
  body: string,
): Promise<SendTextMessageResult> {
  const response = await fetch(buildDialog360Url("/messages"), {
    method: "POST",
    headers: dialog360Headers(apiKey),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
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
        payload?.error?.message || "Unable to send WhatsApp message via 360dialog.",
    };
  }

  const messageId = payload?.messages?.[0]?.id;

  if (!messageId) {
    return {
      success: false,
      message: "360dialog accepted the request but did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

type UploadMediaResult =
  | { success: true; mediaId: string }
  | { success: false; message: string };

export async function uploadWhatsAppMedia(
  _phoneNumberId: string,
  apiKey: string,
  file: Blob,
  mimeType: string,
  fileName: string,
): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
  formData.append("file", file, fileName);

  const response = await fetch(buildDialog360Url("/media"), {
    method: "POST",
    headers: { "D360-API-KEY": apiKey },
    body: formData,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.id) {
    return {
      success: false,
      message:
        payload?.error?.message || "Unable to upload media to WhatsApp.",
    };
  }

  return {
    success: true,
    mediaId: payload.id,
  };
}

type SendMediaMessageResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

export async function sendWhatsAppMediaMessage(
  _phoneNumberId: string,
  apiKey: string,
  to: string,
  mediaType: "image" | "audio" | "document" | "video",
  mediaId: string,
  options?: { caption?: string; filename?: string },
): Promise<SendMediaMessageResult> {
  const mediaPayload: Record<string, unknown> = { id: mediaId };

  if (options?.caption?.trim()) {
    mediaPayload.caption = options.caption.trim();
  }

  if (mediaType === "document" && options?.filename) {
    mediaPayload.filename = options.filename;
  }

  const response = await fetch(buildDialog360Url("/messages"), {
    method: "POST",
    headers: dialog360Headers(apiKey),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
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
        payload?.error?.message || "Unable to send WhatsApp media message.",
    };
  }

  const messageId = payload?.messages?.[0]?.id;

  if (!messageId) {
    return {
      success: false,
      message: "360dialog accepted the media request but did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

export async function sendWhatsAppMediaMessageByUrl(
  _phoneNumberId: string,
  apiKey: string,
  to: string,
  mediaType: "image" | "audio" | "document" | "video",
  mediaUrl: string,
  options?: { caption?: string; filename?: string },
): Promise<SendMediaMessageResult> {
  const mediaPayload: Record<string, unknown> = { link: mediaUrl };

  if (options?.caption?.trim()) {
    mediaPayload.caption = options.caption.trim();
  }

  if (mediaType === "document" && options?.filename) {
    mediaPayload.filename = options.filename;
  }

  const response = await fetch(buildDialog360Url("/messages"), {
    method: "POST",
    headers: dialog360Headers(apiKey),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
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
        payload?.error?.message || "Unable to send WhatsApp media message.",
    };
  }

  const messageId = payload?.messages?.[0]?.id;

  if (!messageId) {
    return {
      success: false,
      message: "360dialog accepted the media request but did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

type DownloadMediaResult =
  | {
      success: true;
      buffer: Buffer;
      mimeType: string;
      fileName: string;
    }
  | { success: false; message: string };

export async function downloadWhatsAppMedia(
  apiKey: string,
  mediaId: string,
  fallbackFileName = "file",
): Promise<DownloadMediaResult> {
  const metaResponse = await fetch(buildDialog360Url(`/${mediaId}`), {
    headers: dialog360Headers(apiKey, false),
    cache: "no-store",
  });

  const metaPayload = (await metaResponse.json().catch(() => null)) as
    | { url?: string; mime_type?: string; error?: { message?: string } }
    | null;

  if (!metaResponse.ok || !metaPayload?.url) {
    return {
      success: false,
      message:
        metaPayload?.error?.message || "Unable to resolve WhatsApp media URL.",
    };
  }

  const fileResponse = await fetch(metaPayload.url, {
    headers: { "D360-API-KEY": apiKey },
    cache: "no-store",
  });

  if (!fileResponse.ok) {
    return {
      success: false,
      message: "Unable to download WhatsApp media file.",
    };
  }

  const mimeType =
    metaPayload.mime_type ||
    fileResponse.headers.get("content-type") ||
    "application/octet-stream";
  const extension = mimeType.includes("/")
    ? `.${mimeType.split("/")[1]?.split(";")[0] ?? "bin"}`
    : "";
  const fileName = fallbackFileName.includes(".")
    ? fallbackFileName
    : `${fallbackFileName}${extension}`;
  const buffer = Buffer.from(await fileResponse.arrayBuffer());

  return {
    success: true,
    buffer,
    mimeType,
    fileName,
  };
}

/** Optional Meta app secret — only needed for legacy direct Meta webhooks. */
export function getWhatsAppWebhookSecret(): string | undefined {
  return process.env[ENV_KEYS.WHATSAPP_APP_SECRET]?.trim() || undefined;
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const appSecret = getWhatsAppWebhookSecret();

  if (!appSecret) {
    return true;
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
