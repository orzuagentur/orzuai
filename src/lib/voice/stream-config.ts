import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  getCachedDeepgramApiKey,
  getCachedElevenLabsApiKey,
  hasDeepgramConfiguredAsync,
  hasElevenLabsConfiguredAsync,
  resolveRuntimeAiKeys,
} from "@/lib/ai/platform-api-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";

export function getVoiceStreamSecret(): string | undefined {
  return resolveSecretValue(ENV_KEYS.VOICE_STREAM_SECRET)?.trim() || undefined;
}

export function getVoiceStreamWsUrl(): string | undefined {
  return process.env[ENV_KEYS.VOICE_STREAM_WS_URL]?.trim() || undefined;
}

function hasLegacyVoiceStreamKeys(): boolean {
  return Boolean(
    resolveSecretValue(ENV_KEYS.DEEPGRAM_API_KEY)?.trim() &&
      resolveSecretValue(ENV_KEYS.ELEVENLABS_API_KEY)?.trim(),
  );
}

export function isVoiceStreamEnabled(): boolean {
  const cachedKeys = getCachedElevenLabsApiKey() && getCachedDeepgramApiKey();

  return Boolean(
    getVoiceStreamWsUrl() && getVoiceStreamSecret() && (cachedKeys || hasLegacyVoiceStreamKeys()),
  );
}

export async function isVoiceStreamEnabledAsync(): Promise<boolean> {
  const [elevenlabs, deepgram] = await Promise.all([
    hasElevenLabsConfiguredAsync(),
    hasDeepgramConfiguredAsync(),
  ]);

  return Boolean(getVoiceStreamWsUrl() && getVoiceStreamSecret() && elevenlabs && deepgram);
}

export async function ensureVoiceStreamRuntimeKeys(): Promise<{
  elevenlabsApiKey: string | null;
  deepgramApiKey: string | null;
}> {
  return resolveRuntimeAiKeys();
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
