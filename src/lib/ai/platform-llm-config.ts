import "server-only";

import { DEFAULT_LLM_FALLBACK_PROVIDERS } from "@/lib/ai/call-types";
import { AI_PROVIDERS, type AiProvider } from "@/lib/ai/constants";
import { resolveSecretValue } from "@/lib/secrets/resolver";

export const PLATFORM_LLM_PROVIDER_QUEUE_KEY = "PLATFORM_LLM_PROVIDER_QUEUE";

const PROVIDER_SET = new Set<string>(AI_PROVIDERS);

export function parsePlatformLlmProviderQueue(
  raw: string | undefined | null,
): AiProvider[] {
  if (!raw?.trim()) {
    return [...DEFAULT_LLM_FALLBACK_PROVIDERS];
  }

  const parsed = raw
    .split(/[,;\n]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter((entry): entry is AiProvider => PROVIDER_SET.has(entry));

  const unique = [...new Set(parsed)];

  return unique.length > 0 ? unique : [...DEFAULT_LLM_FALLBACK_PROVIDERS];
}

export function formatPlatformLlmProviderQueue(providers: readonly AiProvider[]): string {
  return providers.join(",");
}

export function getPlatformLlmProviderQueue(): AiProvider[] {
  return parsePlatformLlmProviderQueue(
    resolveSecretValue(PLATFORM_LLM_PROVIDER_QUEUE_KEY),
  );
}

export function getPrimaryPlatformLlmProvider(): AiProvider {
  return getPlatformLlmProviderQueue()[0] ?? DEFAULT_LLM_FALLBACK_PROVIDERS[0];
}
