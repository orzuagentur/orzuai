import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";

export function getVoiceStreamSecret(): string | undefined {
  return resolveSecretValue(ENV_KEYS.VOICE_STREAM_SECRET)?.trim() || undefined;
}

export function getVoiceStreamWsUrl(): string | undefined {
  return process.env[ENV_KEYS.VOICE_STREAM_WS_URL]?.trim() || undefined;
}

export function isVoiceStreamEnabled(): boolean {
  return Boolean(
    getVoiceStreamWsUrl() &&
      getVoiceStreamSecret() &&
      process.env[ENV_KEYS.DEEPGRAM_API_KEY]?.trim() &&
      process.env[ENV_KEYS.ELEVENLABS_API_KEY]?.trim(),
  );
}

export function signVoiceStreamToken(input: {
  businessId: string;
  callSid: string;
}): string | null {
  const secret = getVoiceStreamSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${input.businessId.trim()}:${input.callSid.trim()}`)
    .digest("base64url");
}

export function verifyVoiceStreamSecret(
  authorizationHeader: string | null,
): boolean {
  const secret = getVoiceStreamSecret();
  if (!secret) {
    return false;
  }

  const provided = authorizationHeader?.trim();
  if (!provided?.startsWith("Bearer ")) {
    return false;
  }

  const token = provided.slice("Bearer ".length).trim();
  const expected = secret;

  const left = Buffer.from(token);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
