import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Fails open when not configured: if `TURNSTILE_SECRET_KEY` is absent, requests
 * are allowed through so the feature can be enabled purely via env vars without
 * breaking existing public forms. When configured, an invalid/missing token is
 * rejected (fail closed).
 */
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env[ENV_KEYS.TURNSTILE_SECRET_KEY]?.trim());
}

export type TurnstileVerifyResult = {
  /** True when the request should be allowed (valid token OR feature disabled). */
  allowed: boolean;
  /** True only when a token was actually verified successfully. */
  verified: boolean;
};

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env[ENV_KEYS.TURNSTILE_SECRET_KEY]?.trim();

  // Feature disabled — allow through (backward compatible).
  if (!secret) {
    return { allowed: true, verified: false };
  }

  const response = token?.trim();

  if (!response) {
    return { allowed: false, verified: false };
  }

  try {
    const body = new URLSearchParams({ secret, response });

    if (remoteIp?.trim()) {
      body.set("remoteip", remoteIp.trim());
    }

    const result = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    if (!result.ok) {
      console.warn("[turnstile] verify returned non-OK", { status: result.status });
      return { allowed: false, verified: false };
    }

    const data = (await result.json()) as { success?: boolean };
    const success = Boolean(data.success);

    return { allowed: success, verified: success };
  } catch (error) {
    console.warn("[turnstile] verify request failed", error);
    return { allowed: false, verified: false };
  }
}
