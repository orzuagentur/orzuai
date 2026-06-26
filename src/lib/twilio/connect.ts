import "server-only";

import { createHmac, randomBytes } from "crypto";

import { buildAppUrl } from "@/lib/app-url";
import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";

const TWILIO_AUTHORIZE_BASE = "https://www.twilio.com/authorize";

export function getTwilioConnectAppSid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_CONNECT_APP_SID)?.trim() || undefined;
}

export function getTwilioPlatformAccountSid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_ACCOUNT_SID)?.trim() || undefined;
}

export function getTwilioPlatformAuthToken(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_AUTH_TOKEN)?.trim() || undefined;
}

export function getTwilioConnectCallbackUrl(): string {
  return buildAppUrl("/api/integrations/twilio/callback");
}

export function buildTwilioConnectAuthorizeUrl(state: string): string {
  const connectAppSid = getTwilioConnectAppSid();

  if (!connectAppSid) {
    throw new Error("Twilio Connect is not configured.");
  }

  const params = new URLSearchParams({ state });
  return `${TWILIO_AUTHORIZE_BASE}/${connectAppSid}?${params.toString()}`;
}

export function createTwilioConnectState(businessId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${businessId}:${nonce}`;
  const secret = getTwilioPlatformAuthToken() ?? "orzu-twilio-connect";

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyTwilioConnectState(
  state: string,
): { businessId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const signature = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const secret = getTwilioPlatformAuthToken() ?? "orzu-twilio-connect";

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (signature !== expected) {
      return null;
    }

    const businessId = payload.split(":")[0];

    if (!businessId) {
      return null;
    }

    return { businessId };
  } catch {
    return null;
  }
}

export function hasTwilioConnectEnv(): boolean {
  return Boolean(
    getTwilioConnectAppSid() &&
      getTwilioPlatformAccountSid() &&
      getTwilioPlatformAuthToken(),
  );
}

export function hasTwilioPlatformEnv(): boolean {
  return Boolean(
    getTwilioPlatformAccountSid() && getTwilioPlatformAuthToken(),
  );
}
