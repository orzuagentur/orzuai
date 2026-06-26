export const PLATFORM_AI_PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Текстовые ответы, аналитика, CRM",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-ответы и Whisper (голос → текст)",
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    description: "Claude для продаж и поддержки",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    description: "Голосовые AI-ответы (текст → голос)",
  },
] as const;

export type PlatformAiProviderId =
  (typeof PLATFORM_AI_PROVIDERS)[number]["id"];

const PROVIDER_LABELS = Object.fromEntries(
  PLATFORM_AI_PROVIDERS.map((provider) => [provider.id, provider.label]),
) as Record<PlatformAiProviderId, string>;

export function getPlatformAiProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider as PlatformAiProviderId] ?? provider;
}
