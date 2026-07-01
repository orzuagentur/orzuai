import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";

const WEBHOOK_SIGNATURE_PARAM = "orzuSig";
const WEBHOOK_SIGNATURE_VERSION_PARAM = "orzuSigVersion";
const CURRENT_SIGNATURE_VERSION = "v1";

function getWebhookSigningSecrets(): string[] {
  const secrets = [
    resolveSecretValue(ENV_KEYS.TWILIO_WEBHOOK_SIGNING_SECRET),
    resolveSecretValue(ENV_KEYS.TWILIO_WEBHOOK_SIGNING_SECRET_PREVIOUS),
    getTwilioPlatformAuthToken(),
  ];

  return Array.from(
    new Set(
      secrets
        .map((secret) => secret?.trim())
        .filter((secret): secret is string => Boolean(secret)),
    ),
  );
}

function signBusinessWebhook(businessId: string, secret: string): string | null {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${CURRENT_SIGNATURE_VERSION}:twilio-webhook:${normalizedBusinessId}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function appendTwilioWebhookSignature(
  url: string,
  businessId: string,
): string {
  const secret = getWebhookSigningSecrets()[0];
  const signature = secret ? signBusinessWebhook(businessId, secret) : null;

  if (!signature) {
    return url;
  }

  const parsed = new URL(url);
  parsed.searchParams.set(
    WEBHOOK_SIGNATURE_VERSION_PARAM,
    CURRENT_SIGNATURE_VERSION,
  );
  parsed.searchParams.set(WEBHOOK_SIGNATURE_PARAM, signature);
  return parsed.toString();
}

export function isOrzuSignedTwilioWebhookValid(input: {
  businessId: string;
  signature: string | null | undefined;
  version?: string | null | undefined;
}): boolean {
  const provided = input.signature?.trim();
  const version = input.version?.trim() || CURRENT_SIGNATURE_VERSION;

  if (!provided || version !== CURRENT_SIGNATURE_VERSION) {
    return false;
  }

  return getWebhookSigningSecrets().some((secret) => {
    const expected = signBusinessWebhook(input.businessId, secret);
    return expected ? safeEqual(provided, expected) : false;
  });
}
