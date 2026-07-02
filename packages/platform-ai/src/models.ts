import type { LlmAiProvider } from "./providers";

export type PlatformAiModelOption = {
  id: string;
  label: string;
  description?: string;
};

export const GEMINI_MODEL_OPTIONS: PlatformAiModelOption[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Быстрый, рекомендуется для чатов и звонков.",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Выше качество для сложных вопросов.",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Legacy — используйте 2.5 Flash.",
  },
];

export const OPENAI_MODEL_OPTIONS: PlatformAiModelOption[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Низкая задержка, рекомендуется для голоса.",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Высокое качество для сложных диалогов.",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    description: "Баланс скорости и качества.",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "Флагман OpenAI.",
  },
];

export const CLAUDE_MODEL_OPTIONS: PlatformAiModelOption[] = [
  {
    id: "claude-3-5-haiku-latest",
    label: "Claude 3.5 Haiku",
    description: "Низкая задержка.",
  },
  {
    id: "claude-3-5-sonnet-latest",
    label: "Claude 3.5 Sonnet",
    description: "Сильное рассуждение.",
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    description: "Новейшая модель Anthropic.",
  },
];

const MODELS_BY_PROVIDER: Record<LlmAiProvider, PlatformAiModelOption[]> = {
  gemini: GEMINI_MODEL_OPTIONS,
  openai: OPENAI_MODEL_OPTIONS,
  claude: CLAUDE_MODEL_OPTIONS,
};

export function getModelsForProvider(
  provider: LlmAiProvider,
): PlatformAiModelOption[] {
  return MODELS_BY_PROVIDER[provider] ?? [];
}

export function getDefaultModelForProvider(provider: LlmAiProvider): string {
  return getModelsForProvider(provider)[0]?.id ?? "gemini-2.5-flash";
}

export function resolveModelForProvider(
  provider: LlmAiProvider,
  model: string | null | undefined,
): string {
  const trimmed = model?.trim();
  const options = getModelsForProvider(provider);

  if (trimmed && options.some((entry) => entry.id === trimmed)) {
    return trimmed;
  }

  return getDefaultModelForProvider(provider);
}
