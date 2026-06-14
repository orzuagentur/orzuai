import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { getMetaAppId } from "@/lib/env";
import { INSTAGRAM_GRAPH_API_BASE } from "@/lib/instagram/constants";
import { getWhatsAppApiVersion, getWhatsAppAppSecret } from "@/lib/whatsapp/client";

export function buildInstagramApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${INSTAGRAM_GRAPH_API_BASE}/${getWhatsAppApiVersion()}/${normalizedPath}`;
}

type ExchangeTokenResult =
  | { success: true; accessToken: string }
  | { success: false; message: string };

export async function exchangeInstagramSignupCode(
  code: string,
): Promise<ExchangeTokenResult> {
  const appId = getMetaAppId();
  const appSecret = getWhatsAppAppSecret();

  if (!appId || !appSecret) {
    return {
      success: false,
      message: "Meta Instagram signup is not configured on the server.",
    };
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });

  const response = await fetch(
    `${buildInstagramApiUrl("oauth/access_token")}?${params.toString()}`,
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

  return { success: true, accessToken: payload.access_token };
}

export type InstagramPageDetails = {
  pageId: string;
  pageName: string;
  igUserId: string;
  username: string;
};

export async function resolveInstagramPageDetails(
  pageId: string,
  accessToken: string,
  fallbackIgUserId?: string,
): Promise<
  | { success: true; details: InstagramPageDetails }
  | { success: false; message: string }
> {
  const response = await fetch(
    buildInstagramApiUrl(
      `${pageId}?fields=name,instagram_business_account{id,username}`,
    ),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        name?: string;
        instagram_business_account?: { id?: string; username?: string };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message ||
        "Unable to load Instagram account details from Meta.",
    };
  }

  const igAccount = payload?.instagram_business_account;
  const igUserId = igAccount?.id ?? fallbackIgUserId;

  if (!igUserId) {
    return {
      success: false,
      message:
        "No Instagram Professional account linked to this Facebook Page.",
    };
  }

  return {
    success: true,
    details: {
      pageId: payload?.id ?? pageId,
      pageName: payload?.name ?? "Instagram Page",
      igUserId,
      username: igAccount?.username ?? "",
    },
  };
}

export async function subscribeInstagramPage(
  pageId: string,
  accessToken: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const response = await fetch(
    buildInstagramApiUrl(
      `${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks`,
    ),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

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
      "Unable to subscribe the app to Instagram messaging webhooks.",
  };
}

type SendInstagramMessageResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

export type InstagramUserProfile = {
  name?: string;
  username?: string;
  profilePicUrl?: string;
};

export async function fetchInstagramUserProfile(
  userId: string,
  accessToken: string,
): Promise<
  | { success: true; profile: InstagramUserProfile }
  | { success: false; message: string }
> {
  const params = new URLSearchParams({
    fields: "name,username,profile_pic",
  });

  const response = await fetch(
    `${buildInstagramApiUrl(userId)}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        name?: string;
        username?: string;
        profile_pic?: string;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message ||
        "Unable to load Instagram user profile from Meta.",
    };
  }

  return {
    success: true,
    profile: {
      name: payload?.name,
      username: payload?.username,
      profilePicUrl: payload?.profile_pic,
    },
  };
}

type InstagramAttachmentType = "image" | "video" | "audio" | "file";

function resolveInstagramAttachmentType(
  mediaKind: "image" | "audio" | "document" | "video",
): InstagramAttachmentType {
  if (mediaKind === "document") {
    return "file";
  }

  return mediaKind;
}

export async function sendInstagramMediaMessage(
  pageId: string,
  accessToken: string,
  recipientId: string,
  mediaKind: "image" | "audio" | "document" | "video",
  mediaUrl: string,
): Promise<SendInstagramMessageResult> {
  const response = await fetch(buildInstagramApiUrl(`${pageId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "instagram",
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: resolveInstagramAttachmentType(mediaKind),
          payload: {
            url: mediaUrl,
            is_reusable: true,
          },
        },
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { message_id?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message || "Unable to send Instagram media via Meta.",
    };
  }

  const messageId = payload?.message_id;

  if (!messageId) {
    return {
      success: false,
      message: "Meta accepted the media request but did not return a message ID.",
    };
  }

  return { success: true, messageId };
}

export type InstagramSenderAction = "typing_on" | "typing_off" | "mark_seen";

export async function sendInstagramTypingAction(
  pageId: string,
  accessToken: string,
  recipientId: string,
  senderAction: InstagramSenderAction,
): Promise<{ success: true } | { success: false; message: string }> {
  const response = await fetch(buildInstagramApiUrl(`${pageId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "instagram",
      recipient: { id: recipientId },
      sender_action: senderAction,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message ||
        "Unable to send Instagram typing indicator via Meta.",
    };
  }

  return { success: true };
}

export async function sendInstagramTextMessage(
  pageId: string,
  accessToken: string,
  recipientId: string,
  body: string,
): Promise<SendInstagramMessageResult> {
  const response = await fetch(buildInstagramApiUrl(`${pageId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "instagram",
      recipient: { id: recipientId },
      message: { text: body },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { message_id?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    return {
      success: false,
      message:
        payload?.error?.message || "Unable to send Instagram message via Meta.",
    };
  }

  const messageId = payload?.message_id;

  if (!messageId) {
    return {
      success: false,
      message: "Meta accepted the request but did not return a message ID.",
    };
  }

  return { success: true, messageId };
}

export async function fetchInstagramMessageAttachmentUrl(
  accessToken: string,
  messageId: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    fields: "attachments",
    access_token: accessToken,
  });

  const response = await fetch(
    `${buildInstagramApiUrl(messageId)}?${params.toString()}`,
    { cache: "no-store" },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        attachments?: {
          data?: Array<{
            payload?: { url?: string };
          }>;
        };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[instagram] attachment URL refresh failed",
        payload?.error?.message,
      );
    }
    return null;
  }

  return payload?.attachments?.data?.[0]?.payload?.url ?? null;
}

export function verifyInstagramWebhookSignature(
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

export function getInstagramVerifyToken(): string | undefined {
  return (
    process.env[ENV_KEYS.INSTAGRAM_VERIFY_TOKEN]?.trim() ||
    process.env[ENV_KEYS.WHATSAPP_VERIFY_TOKEN]?.trim() ||
    undefined
  );
}
