import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { ENV_KEYS } from "@/constants/env-keys";

export type GmailPushNotification = {
  emailAddress: string;
  historyId: string;
};

export type PubSubPushEnvelope = {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

export function getGmailPubsubTopic(): string | undefined {
  return process.env[ENV_KEYS.GMAIL_PUBSUB_TOPIC]?.trim() || undefined;
}

export function getGmailPubsubPushSecret(): string | undefined {
  return process.env[ENV_KEYS.GMAIL_PUBSUB_PUSH_SECRET]?.trim() || undefined;
}

export function hasGmailPushEnv(): boolean {
  return Boolean(getGmailPubsubTopic() && getGmailPubsubPushSecret());
}

export function getGmailPushWebhookUrl(): string {
  const secret = getGmailPubsubPushSecret();
  const base = buildAppUrl("/api/webhooks/gmail-push");

  if (!secret) {
    return base;
  }

  return `${base}?token=${encodeURIComponent(secret)}`;
}

export function isValidGmailPushToken(token: string | null): boolean {
  const secret = getGmailPubsubPushSecret();

  if (!secret) {
    return false;
  }

  return token === secret;
}

export function parseGmailPushEnvelope(
  body: PubSubPushEnvelope,
): GmailPushNotification | null {
  const encoded = body.message?.data;

  if (!encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as {
      emailAddress?: string;
      historyId?: string | number;
    };

    const emailAddress = payload.emailAddress?.trim().toLowerCase();
    const historyId =
      payload.historyId !== undefined && payload.historyId !== null
        ? String(payload.historyId)
        : null;

    if (!emailAddress || !historyId) {
      return null;
    }

    return { emailAddress, historyId };
  } catch {
    return null;
  }
}
