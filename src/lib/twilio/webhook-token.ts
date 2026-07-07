import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";

const WEBHOOK_SIGNATURE_PARAM = "orzuSig";
const WEBHOOK_SIGNATURE_VERSION_PARAM = "orzuSigVersion";
const CURRENT_SIGNATURE_VERSION = "v2";
const LEGACY_SIGNATURE_VERSION = "v1";

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

function normalizeWebhookMethod(method: string | null | undefined): string {
  return method?.trim().toUpperCase() || "POST";
}

function normalizeWebhookPath(pathname: string | null | undefined): string {
  const path = pathname?.trim() || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function signBusinessWebhook(input: {
  businessId: string;
  method?: string | null;
  pathname?: string | null;
  secret: string;
}): string | null {
  const normalizedBusinessId = input.businessId.trim();

  if (!normalizedBusinessId) {
    return null;
  }

  return createHmac("sha256", input.secret)
    .update(
      [
        CURRENT_SIGNATURE_VERSION,
        "twilio-webhook",
        normalizeWebhookMethod(input.method),
        normalizeWebhookPath(input.pathname),
        normalizedBusinessId,
      ].join(":"),
    )
    .digest("base64url");
}

function signLegacyBusinessWebhook(
  businessId: string,
  secret: string,
): string | null {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${LEGACY_SIGNATURE_VERSION}:twilio-webhook:${normalizedBusinessId}`)
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
  const parsed = new URL(url);
  const signature = secret
    ? signBusinessWebhook({
        businessId,
        method: "POST",
        pathname: parsed.pathname,
        secret,
      })
    : null;

  if (!signature) {
    return url;
  }

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
  method?: string | null | undefined;
  pathname?: string | null | undefined;
}): boolean {
  const provided = input.signature?.trim();
  const version = input.version?.trim() || CURRENT_SIGNATURE_VERSION;

  if (!provided) {
    return false;
  }

  if (version !== CURRENT_SIGNATURE_VERSION) {
    return (
      process.env.NODE_ENV !== "production" &&
      version === LEGACY_SIGNATURE_VERSION &&
      getWebhookSigningSecrets().some((secret) => {
        const expected = signLegacyBusinessWebhook(input.businessId, secret);
        return expected ? safeEqual(provided, expected) : false;
      })
    );
  }

  return getWebhookSigningSecrets().some((secret) => {
    const expected = signBusinessWebhook({
      businessId: input.businessId,
      method: input.method,
      pathname: input.pathname,
      secret,
    });
    return expected ? safeEqual(provided, expected) : false;
  });
}
