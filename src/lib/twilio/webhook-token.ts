import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";

const WEBHOOK_SIGNATURE_PARAM = "orzuSig";

function getWebhookSigningSecret(): string | null {
  return getTwilioPlatformAuthToken() ?? null;
}

function signBusinessWebhook(businessId: string): string | null {
  const secret = getWebhookSigningSecret();
  const normalizedBusinessId = businessId.trim();

  if (!secret || !normalizedBusinessId) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`twilio-webhook:${normalizedBusinessId}`)
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
  const signature = signBusinessWebhook(businessId);

  if (!signature) {
    return url;
  }

  const parsed = new URL(url);
  parsed.searchParams.set(WEBHOOK_SIGNATURE_PARAM, signature);
  return parsed.toString();
}

export function isOrzuSignedTwilioWebhookValid(input: {
  businessId: string;
  signature: string | null | undefined;
}): boolean {
  const expected = signBusinessWebhook(input.businessId);
  const provided = input.signature?.trim();

  if (!expected || !provided) {
    return false;
  }

  return safeEqual(provided, expected);
}
