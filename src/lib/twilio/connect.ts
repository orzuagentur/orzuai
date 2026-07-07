import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { buildAppUrl } from "@/lib/app-url";
import { ENV_KEYS } from "@/constants/env-keys";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import { createAdminClient } from "@/lib/supabase/admin";

const TWILIO_AUTHORIZE_BASE = "https://www.twilio.com/authorize";
const TWILIO_CONNECT_STATE_TTL_MS = 10 * 60 * 1000;

type SupabaseMutationResult = {
  error: { message: string } | null;
};

type TwilioOAuthStateUpdateBuilder = {
  eq(column: string, value: string): TwilioOAuthStateUpdateBuilder;
  is(column: string, value: null): TwilioOAuthStateUpdateBuilder;
  gt(column: string, value: string): TwilioOAuthStateUpdateBuilder;
  select(
    columns: string,
  ): {
    maybeSingle(): Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }>;
  };
};

type TwilioOAuthStateTable = {
  insert(row: {
    business_id: string;
    nonce: string;
    expires_at: string;
  }): PromiseLike<SupabaseMutationResult>;
  update(row: { consumed_at: string }): TwilioOAuthStateUpdateBuilder;
};

type TwilioOAuthStateClient = {
  from(table: "twilio_oauth_states"): TwilioOAuthStateTable;
};

function getTwilioOAuthStateClient(): TwilioOAuthStateClient {
  return createAdminClient() as unknown as TwilioOAuthStateClient;
}

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

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function createTwilioConnectState(
  businessId: string,
): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + TWILIO_CONNECT_STATE_TTL_MS);
  const payload = `${businessId}:${nonce}:${expiresAt.getTime()}`;
  const secret = getTwilioPlatformAuthToken();

  if (!secret) {
    throw new Error("Twilio Connect auth token is not configured.");
  }

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (hasSupabaseEnv()) {
    const admin = getTwilioOAuthStateClient();
    await admin.from("twilio_oauth_states").insert({
      business_id: businessId,
      nonce,
      expires_at: expiresAt.toISOString(),
    });
  }

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export async function verifyTwilioConnectState(
  state: string,
): Promise<{ businessId: string } | null> {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const signature = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const secret = getTwilioPlatformAuthToken();

    if (!secret) {
      return null;
    }

    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (!safeEqual(signature, expected)) {
      return null;
    }

    const [businessId, nonce, expiresAtRaw] = payload.split(":");
    const expiresAt = Number.parseInt(expiresAtRaw ?? "", 10);

    if (!businessId || !nonce || !Number.isFinite(expiresAt)) {
      return null;
    }

    if (Date.now() > expiresAt) {
      return null;
    }

    if (hasSupabaseEnv()) {
      const admin = getTwilioOAuthStateClient();
      const { data } = await admin
        .from("twilio_oauth_states")
        .update({ consumed_at: new Date().toISOString() })
        .eq("business_id", businessId)
        .eq("nonce", nonce)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("id")
        .maybeSingle();

      if (!data?.id) {
        return null;
      }
    }

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
