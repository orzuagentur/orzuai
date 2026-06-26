export const AI_PROVIDERS = ["gemini", "openai", "claude"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiProviderAvailability = Record<AiProvider, boolean>;

export const DEFAULT_LLM_PROVIDER_QUEUE: AiProvider[] = [
  "gemini",
  "openai",
  "claude",
];

export const PLATFORM_LLM_PROVIDER_QUEUE_KEY = "PLATFORM_LLM_PROVIDER_QUEUE";

const PROVIDER_SET = new Set<string>(AI_PROVIDERS);

const PROVIDER_SECRET_KEYS: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

export function parsePlatformLlmProviderQueue(
  raw: string | undefined | null,
): AiProvider[] {
  if (!raw?.trim()) {
    return [...DEFAULT_LLM_PROVIDER_QUEUE];
  }

  const parsed = raw
    .split(/[,;\n]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter((entry): entry is AiProvider => PROVIDER_SET.has(entry));

  const unique = [...new Set(parsed)];

  return unique.length > 0 ? unique : [...DEFAULT_LLM_PROVIDER_QUEUE];
}

export function formatPlatformLlmProviderQueue(
  providers: readonly AiProvider[],
): string {
  return providers.join(",");
}

export function getProviderLabel(provider: AiProvider): string {
  if (provider === "openai") {
    return "OpenAI";
  }

  if (provider === "claude") {
    return "Claude";
  }

  return "Gemini";
}

export { PROVIDER_SECRET_KEYS };
