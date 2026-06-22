import "server-only";

import { createHmac, randomBytes } from "crypto";

import { buildAppUrl } from "@/lib/app-url";
import { getGoogleClientId, getGoogleClientSecret } from "@/lib/env";
import { GMAIL_SCOPES } from "@/features/email/constants";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GmailOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
};

export function getGmailRedirectUri(): string {
  return buildAppUrl("/api/integrations/gmail/callback");
}

export function buildGmailAuthUrl(state: string): string {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error("Google OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGmailRedirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function createGmailOAuthState(businessId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${businessId}:${nonce}`;
  const secret = getGoogleClientSecret() ?? "orzu-gmail-oauth";

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyGmailOAuthState(
  state: string,
): { businessId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const signature = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const secret = getGoogleClientSecret() ?? "orzu-gmail-oauth";

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

export async function exchangeGmailCode(code: string): Promise<GmailOAuthTokens> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGmailRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Token exchange failed.");
  }

  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scope: data.scope ?? null,
  };
}

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<GmailOAuthTokens> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Token refresh failed.");
  }

  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    scope: data.scope ?? null,
  };
}

export async function fetchGmailAccountEmail(
  accessToken: string,
): Promise<string | null> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GoogleUserInfo;
  return data.email ?? null;
}
