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
  return resolveSecretValue(ENV_KEYS.VOICE_STREAM_WS_URL)?.trim() || undefined;
}

export function getVoiceStreamConnectWsUrl(): string | undefined {
  const streamUrl = getVoiceStreamWsUrl();
  if (!streamUrl) {
    return undefined;
  }

  const normalized = streamUrl.replace(/\/$/, "");
  if (normalized.endsWith("/voice/stream")) {
    return normalized;
  }

  return `${normalized}/voice/stream`;
}

export function getVoiceMonitorWsUrl(): string | null {
  const streamUrl = getVoiceStreamWsUrl();
  if (!streamUrl) {
    return null;
  }

  const normalized = streamUrl.replace(/\/$/, "");
  if (normalized.endsWith("/voice/stream")) {
    return `${normalized.slice(0, -"/voice/stream".length)}/voice/monitor`;
  }

  return `${normalized}/voice/monitor`;
}

const MONITOR_TOKEN_TTL_SECONDS = 300;

export type MonitorTokenClaims = {
  businessId: string;
  callSid: string;
  callLogId: string;
  exp: number;
};

export function signMonitorToken(input: {
  businessId: string;
  callSid: string;
  callLogId: string;
  ttlSeconds?: number;
}): string | null {
  const secret = getVoiceStreamSecret();
  if (!secret) {
    return null;
  }

  const exp =
    Math.floor(Date.now() / 1000) +
    (input.ttlSeconds ?? MONITOR_TOKEN_TTL_SECONDS);
  const payload = [
    input.businessId.trim(),
    input.callSid.trim(),
    input.callLogId.trim(),
    String(exp),
  ].join(":");

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
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
