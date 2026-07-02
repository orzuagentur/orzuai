export const LLM_AI_PROVIDERS = ["gemini", "openai", "claude"] as const;

export type LlmAiProvider = (typeof LLM_AI_PROVIDERS)[number];

/** API-only providers (no model picker on use-case cards). */
export const API_AI_PROVIDERS = ["elevenlabs", "deepgram"] as const;

export type ApiAiProvider = (typeof API_AI_PROVIDERS)[number];

export const PLATFORM_AI_PROVIDERS = [
  ...LLM_AI_PROVIDERS,
  ...API_AI_PROVIDERS,
] as const;

export type PlatformAiProvider = (typeof PLATFORM_AI_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<PlatformAiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  claude: "Anthropic Claude",
  elevenlabs: "ElevenLabs",
  deepgram: "Deepgram",
};

export function getProviderLabel(provider: PlatformAiProvider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function isLlmProvider(
  provider: string,
): provider is LlmAiProvider {
  return (LLM_AI_PROVIDERS as readonly string[]).includes(provider);
}

export function isApiProvider(
  provider: string,
): provider is ApiAiProvider {
  return (API_AI_PROVIDERS as readonly string[]).includes(provider);
}

export function buildPlatformAiCredentialKeyName(credentialId: string): string {
  return `PLATFORM_AI_CRED_${credentialId.replace(/-/g, "").toUpperCase()}`;
}
