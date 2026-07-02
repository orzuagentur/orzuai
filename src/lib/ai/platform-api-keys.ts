import "server-only";

import type { AiProvider } from "@/lib/ai/constants";
import { DEFAULT_LLM_FALLBACK_PROVIDERS } from "@/lib/ai/call-types";
import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import {
  getPlatformAiFallbackProviders,
  resolvePlatformAiForUseCase,
} from "@/services/platform-ai-config.service";

export type ResolvedRuntimeAiKeys = {
  elevenlabsApiKey: string | null;
  deepgramApiKey: string | null;
  openaiApiKey: string | null;
};

export async function resolveOpenAiApiKeyForVoice(): Promise<string | null> {
  const fromUseCase = await resolvePlatformAiForUseCase("ai_phone_call");
  if (fromUseCase?.provider === "openai" && fromUseCase.apiKey?.trim()) {
    return fromUseCase.apiKey.trim();
  }

  return resolveSecretValue(ENV_KEYS.OPENAI_API_KEY)?.trim() ?? null;
}

export async function resolveElevenLabsApiKey(): Promise<string | null> {
  const fromUseCase = await resolvePlatformAiForUseCase("voice_message_tts");
  if (fromUseCase?.apiKey?.trim()) {
    return fromUseCase.apiKey.trim();
  }

  return resolveSecretValue(ENV_KEYS.ELEVENLABS_API_KEY)?.trim() ?? null;
}

export async function resolveDeepgramApiKey(): Promise<string | null> {
  const fromUseCase = await resolvePlatformAiForUseCase("phone_call_stt");
  if (fromUseCase?.apiKey?.trim()) {
    return fromUseCase.apiKey.trim();
  }

  return resolveSecretValue(ENV_KEYS.DEEPGRAM_API_KEY)?.trim() ?? null;
}

export async function resolveRuntimeAiKeys(): Promise<ResolvedRuntimeAiKeys> {
  const [elevenlabsApiKey, deepgramApiKey, openaiApiKey] = await Promise.all([
    resolveElevenLabsApiKey(),
    resolveDeepgramApiKey(),
    resolveOpenAiApiKeyForVoice(),
  ]);

  return { elevenlabsApiKey, deepgramApiKey, openaiApiKey };
}

export async function hasElevenLabsConfiguredAsync(): Promise<boolean> {
  return Boolean(await resolveElevenLabsApiKey());
}

export async function hasDeepgramConfiguredAsync(): Promise<boolean> {
  return Boolean(await resolveDeepgramApiKey());
}

export async function getPrimaryPlatformLlmProviderAsync(): Promise<AiProvider> {
  const providers = await getPlatformAiFallbackProviders("auto_reply");
  return providers[0] ?? DEFAULT_LLM_FALLBACK_PROVIDERS[0];
}

let runtimeKeyCache: {
  expiresAt: number;
  keys: ResolvedRuntimeAiKeys;
} | null = null;

let primaryLlmCache: {
  expiresAt: number;
  provider: AiProvider;
} | null = null;

const RUNTIME_CACHE_TTL_MS = 60_000;

export async function warmPlatformAiRuntimeCache(): Promise<void> {
  const [keys, provider] = await Promise.all([
    resolveRuntimeAiKeys(),
    getPrimaryPlatformLlmProviderAsync(),
  ]);

  runtimeKeyCache = {
    expiresAt: Date.now() + RUNTIME_CACHE_TTL_MS,
    keys,
  };

  primaryLlmCache = {
    expiresAt: Date.now() + RUNTIME_CACHE_TTL_MS,
    provider,
  };
}

export function getCachedRuntimeAiKeys(): ResolvedRuntimeAiKeys | null {
  if (!runtimeKeyCache || runtimeKeyCache.expiresAt <= Date.now()) {
    return null;
  }

  return runtimeKeyCache.keys;
}

export function getCachedPrimaryLlmProvider(): AiProvider | null {
  if (!primaryLlmCache || primaryLlmCache.expiresAt <= Date.now()) {
    return null;
  }

  return primaryLlmCache.provider;
}

export function invalidatePlatformAiRuntimeCache(): void {
  runtimeKeyCache = null;
  primaryLlmCache = null;
}

export function getCachedElevenLabsApiKey(): string | null {
  return getCachedRuntimeAiKeys()?.elevenlabsApiKey ?? null;
}

export function getCachedDeepgramApiKey(): string | null {
  return getCachedRuntimeAiKeys()?.deepgramApiKey ?? null;
}
