import "server-only";

import { DEFAULT_LLM_FALLBACK_PROVIDERS } from "@/lib/ai/call-types";
import type { AiProvider } from "@/lib/ai/constants";
import { getCachedPrimaryLlmProvider } from "@/lib/ai/platform-api-keys";
import { hasClaudeEnv, hasGeminiEnv, hasOpenAiEnv } from "@/lib/env";

export const PLATFORM_LLM_PROVIDER_QUEUE_KEY = "PLATFORM_LLM_PROVIDER_QUEUE";

/** @deprecated Legacy global queue removed — use platform AI use-case config. */
export function parsePlatformLlmProviderQueue(
  _raw?: string | null,
): AiProvider[] {
  return getSyncConfiguredLlmProviders();
}

/** @deprecated Legacy global queue removed — use platform AI use-case config. */
export function formatPlatformLlmProviderQueue(
  providers: readonly AiProvider[],
): string {
  return providers.join(",");
}

function getSyncConfiguredLlmProviders(): AiProvider[] {
  const cached = getCachedPrimaryLlmProvider();
  const configured: AiProvider[] = [];

  if (hasGeminiEnv()) {
    configured.push("gemini");
  }
  if (hasOpenAiEnv()) {
    configured.push("openai");
  }
  if (hasClaudeEnv()) {
    configured.push("claude");
  }

  if (configured.length === 0) {
    return [...DEFAULT_LLM_FALLBACK_PROVIDERS];
  }

  if (cached && !configured.includes(cached)) {
    return [cached, ...configured];
  }

  return configured;
}

/** @deprecated Use getPlatformAiFallbackProviders(callType) for runtime routing. */
export function getPlatformLlmProviderQueue(): AiProvider[] {
  return getSyncConfiguredLlmProviders();
}

/** Primary LLM provider for legacy sync callers (cached from use-case config). */
export function getPrimaryPlatformLlmProvider(): AiProvider {
  return (
    getCachedPrimaryLlmProvider() ??
    getSyncConfiguredLlmProviders()[0] ??
    DEFAULT_LLM_FALLBACK_PROVIDERS[0]
  );
}

export { getPrimaryPlatformLlmProviderAsync } from "@/lib/ai/platform-api-keys";
