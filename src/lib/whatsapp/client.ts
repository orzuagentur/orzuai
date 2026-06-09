import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { getMetaAppId } from "@/lib/env";
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

type UploadMediaResult =
  | { success: true; mediaId: string }
  | { success: false; message: string };

export async function uploadWhatsAppMedia(
  phoneNumberId: string,
  accessToken: string,
  file: Blob,
  mimeType: string,
  fileName: string,
): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
  formData.append("file", file, fileName);

  const response = await fetch(buildWhatsAppApiUrl(`${phoneNumberId}/media`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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
  phoneNumberId: string,
  accessToken: string,
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

  const response = await fetch(buildWhatsAppApiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
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
      message: "Meta accepted the media request but did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

type ExchangeTokenResult =
  | { success: true; accessToken: string }
  | { success: false; message: string };

export async function exchangeEmbeddedSignupCode(
  code: string,
): Promise<ExchangeTokenResult> {
  const appId = getMetaAppId();
  const appSecret = getWhatsAppAppSecret();

  if (!appId || !appSecret) {
    return {
      success: false,
      message: "Meta Embedded Signup is not configured on the server.",
    };
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });

  const response = await fetch(
    `${buildWhatsAppApiUrl("oauth/access_token")}?${params.toString()}`,
    { cache: "no-store" },
  );

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.access_token) {
    return {
      success: false,
      message:
        payload?.error?.message ||
        "Unable to exchange the Meta authorization code for an access token.",
    };
  }

  return {
    success: true,
    accessToken: payload.access_token,
  };
}

type SubscribeWabaResult =
  | { success: true }
  | { success: false; message: string };

export async function subscribeAppToWaba(
  wabaId: string,
  accessToken: string,
): Promise<SubscribeWabaResult> {
  const response = await fetch(buildWhatsAppApiUrl(`${wabaId}/subscribed_apps`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.ok) {
    return { success: true };
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  return {
    success: false,
    message:
      payload?.error?.message ||
      "Unable to subscribe the app to the WhatsApp Business Account.",
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
