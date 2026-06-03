/** Used when GEMINI_DEFAULT_MODEL is not set in the environment. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (recommended)",
    description: "Fast, cost-effective replies for customer support.",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Higher quality for complex questions.",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash (legacy)",
    description: "Older model — switch to 2.5 Flash when possible.",
  },
] as const;

export const GEMINI_MODEL_IDS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
] as const;

export type GeminiModelId = (typeof GEMINI_MODEL_IDS)[number];

const LEGACY_GEMINI_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-pro",
]);

export function resolveGeminiModel(model: string | null | undefined): string {
  const trimmed = model?.trim();

  if (!trimmed || LEGACY_GEMINI_MODELS.has(trimmed)) {
    return DEFAULT_GEMINI_MODEL;
  }

  if ((GEMINI_MODEL_IDS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }

  return DEFAULT_GEMINI_MODEL;
}

export function isRecommendedGeminiModel(model: string): boolean {
  return model === DEFAULT_GEMINI_MODEL;
}

export const GEMINI_GENERATION = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
} as const;

export const GEMINI_MAX_HISTORY_MESSAGES = 20;

export const GEMINI_MAX_KNOWLEDGE_ENTRIES = 25;

export const GEMINI_MAX_MESSAGE_LENGTH = 4000;

export const GEMINI_MAX_SYSTEM_PROMPT_LENGTH = 8000;
