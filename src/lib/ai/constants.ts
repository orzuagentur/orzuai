import { GEMINI_MODEL_OPTIONS } from "@/lib/gemini/constants";

export const AI_PROVIDERS = ["gemini", "openai", "claude"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const OPENAI_MODEL_OPTIONS = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini (recommended)",
    description: "Fast and affordable for support replies.",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Higher quality for complex conversations.",
  },
] as const;

export const CLAUDE_MODEL_OPTIONS = [
  {
    id: "claude-3-5-haiku-latest",
    label: "Claude 3.5 Haiku (recommended)",
    description: "Low latency, cost-effective replies.",
  },
  {
    id: "claude-3-5-sonnet-latest",
    label: "Claude 3.5 Sonnet",
    description: "Strong reasoning for sales and support.",
  },
] as const;

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  claude: "Anthropic Claude",
};

export function getModelsForProvider(provider: AiProvider) {
  if (provider === "openai") {
    return OPENAI_MODEL_OPTIONS;
  }

  if (provider === "claude") {
    return CLAUDE_MODEL_OPTIONS;
  }

  return GEMINI_MODEL_OPTIONS;
}

export function getDefaultModelForProvider(provider: AiProvider): string {
  return getModelsForProvider(provider)[0]?.id ?? "gemini-2.5-flash";
}

export function resolveAiModel(
  provider: AiProvider,
  model: string | null | undefined,
): string {
  const options = getModelsForProvider(provider);
  const trimmed = model?.trim();

  if (trimmed && options.some((option) => option.id === trimmed)) {
    return trimmed;
  }

  return getDefaultModelForProvider(provider);
}

export function isValidAiModel(provider: AiProvider, model: string): boolean {
  return getModelsForProvider(provider).some((option) => option.id === model);
}

export const CUSTOM_MODEL_OPTION_ID = "__custom__";

export function resolveAgentModel(
  provider: AiProvider,
  model: string,
  useCustomModel: boolean,
): string {
  const trimmed = model.trim();

  if (useCustomModel && trimmed) {
    return trimmed;
  }

  return resolveAiModel(provider, trimmed);
}

export function resolveLlmModel(
  provider: AiProvider,
  model: string | null | undefined,
): string {
  const trimmed = model?.trim();

  if (!trimmed) {
    return getDefaultModelForProvider(provider);
  }

  if (isValidAiModel(provider, trimmed)) {
    return trimmed;
  }

  return trimmed;
}
