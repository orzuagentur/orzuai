import "server-only";

import { createHmac, randomBytes } from "crypto";

import { OUTLOOK_SCOPES } from "@/features/email/outlook-constants";
import { buildAppUrl } from "@/lib/app-url";
import {
  getMicrosoftClientId,
  getMicrosoftClientSecret,
  getMicrosoftTenantId,
} from "@/lib/env";

export type OutlookOAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
};

type MicrosoftTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function tenantPath(): string {
  return getMicrosoftTenantId() || "common";
}

function authorizeUrl(): string {
  return `https://login.microsoftonline.com/${tenantPath()}/oauth2/v2.0/authorize`;
}

function tokenUrl(): string {
  return `https://login.microsoftonline.com/${tenantPath()}/oauth2/v2.0/token`;
}

export function getOutlookRedirectUri(): string {
  return buildAppUrl("/api/integrations/outlook/callback");
}

export function buildOutlookAuthUrl(state: string): string {
  const clientId = getMicrosoftClientId();

  if (!clientId) {
    throw new Error("Microsoft OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOutlookRedirectUri(),
    response_type: "code",
    response_mode: "query",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });

  return `${authorizeUrl()}?${params.toString()}`;
}

export function createOutlookOAuthState(businessId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${businessId}:${nonce}`;
  const secret = getMicrosoftClientSecret() ?? "orzu-outlook-oauth";
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyOutlookOAuthState(
  state: string,
): { businessId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    const signature = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const secret = getMicrosoftClientSecret() ?? "orzu-outlook-oauth";
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

export async function exchangeOutlookCode(
  code: string,
): Promise<OutlookOAuthTokens> {
  const clientId = getMicrosoftClientId();
  const clientSecret = getMicrosoftClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth is not configured.");
  }

  const response = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getOutlookRedirectUri(),
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPES.join(" "),
    }),
  });

  const data = (await response.json()) as MicrosoftTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Outlook token exchange failed.",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    scope: data.scope ?? null,
  };
}

export async function refreshOutlookAccessToken(
  refreshToken: string,
): Promise<OutlookOAuthTokens> {
  const clientId = getMicrosoftClientId();
  const clientSecret = getMicrosoftClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth is not configured.");
  }

  const response = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES.join(" "),
    }),
  });

  const data = (await response.json()) as MicrosoftTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Outlook token refresh failed.",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    scope: data.scope ?? null,
  };
}

export async function fetchOutlookAccountEmail(
  accessToken: string,
): Promise<string | null> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    mail?: string;
    userPrincipalName?: string;
  };

  const email = data.mail?.trim() || data.userPrincipalName?.trim() || null;
  return email?.includes("@") ? email.toLowerCase() : null;
}
