import type { LlmAiProvider } from "./providers";
import { getDefaultModelForProvider } from "./models";

export type PlatformAiUseCaseKind = "llm" | "api";

export type PlatformAiUseCaseDefinition = {
  id: string;
  label: string;
  description: string;
  category: "messaging" | "voice" | "background";
  kind: PlatformAiUseCaseKind;
  callTypes: string[];
  supportedProviders: readonly (LlmAiProvider | "elevenlabs" | "deepgram")[];
  defaultProvider: LlmAiProvider | "elevenlabs" | "deepgram";
  defaultModel?: string;
};

export const PLATFORM_AI_USE_CASES: PlatformAiUseCaseDefinition[] = [
  {
    id: "channel_messages",
    label: "Сообщения каналов",
    description:
      "Автоответы в WhatsApp, Telegram, Email, Website Forms и других каналах.",
    category: "messaging",
    kind: "llm",
    callTypes: ["auto_reply"],
    supportedProviders: ["gemini", "openai", "claude"],
    defaultProvider: "gemini",
    defaultModel: getDefaultModelForProvider("gemini"),
  },
  {
    id: "follow_up",
    label: "Follow-up агент",
    description: "Проактивные follow-up сообщения клиентам.",
    category: "messaging",
    kind: "llm",
    callTypes: ["follow_up"],
    supportedProviders: ["gemini", "openai", "claude"],
    defaultProvider: "gemini",
    defaultModel: getDefaultModelForProvider("gemini"),
  },
  {
    id: "voice_message_stt",
    label: "Голосовые сообщения → текст",
    description: "Расшифровка voice note в чатах (Whisper / OpenAI).",
    category: "voice",
    kind: "llm",
    callTypes: ["voice_stt"],
    supportedProviders: ["openai"],
    defaultProvider: "openai",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "voice_message_tts",
    label: "Текст → голосовое сообщение",
    description: "Озвучка ответа агента в WhatsApp / Telegram.",
    category: "voice",
    kind: "api",
    callTypes: ["voice_tts"],
    supportedProviders: ["elevenlabs"],
    defaultProvider: "elevenlabs",
  },
  {
    id: "ai_phone_call",
    label: "AI звонок (реалтайм)",
    description: "Speech-to-speech на телефонных звонках через Media Streams.",
    category: "voice",
    kind: "llm",
    callTypes: ["voice"],
    supportedProviders: ["openai", "gemini", "claude"],
    defaultProvider: "openai",
    defaultModel: getDefaultModelForProvider("openai"),
  },
  {
    id: "phone_call_stt",
    label: "AI звонок → распознавание речи",
    description: "Deepgram STT для потоковых телефонных звонков.",
    category: "voice",
    kind: "api",
    callTypes: ["voice_stt"],
    supportedProviders: ["deepgram"],
    defaultProvider: "deepgram",
  },
  {
    id: "orchestrator",
    label: "Оркестратор CRM",
    description: "Фоновые задачи: сделки, заметки, календарь после ответа.",
    category: "background",
    kind: "llm",
    callTypes: ["orchestrator", "crm_plan"],
    supportedProviders: ["gemini", "openai", "claude"],
    defaultProvider: "gemini",
    defaultModel: getDefaultModelForProvider("gemini"),
  },
  {
    id: "background_ai",
    label: "Фоновый AI",
    description:
      "Sentiment, BANT, analytics, conversation summary и внутренние задачи.",
    category: "background",
    kind: "llm",
    callTypes: [
      "sentiment",
      "bant",
      "automation",
      "intent",
      "analytics",
      "conversation_summary",
      "other",
    ],
    supportedProviders: ["gemini", "openai", "claude"],
    defaultProvider: "gemini",
    defaultModel: getDefaultModelForProvider("gemini"),
  },
  {
    id: "knowledge_embeddings",
    label: "База знаний (embeddings)",
    description: "Векторизация документов для RAG.",
    category: "background",
    kind: "llm",
    callTypes: ["other"],
    supportedProviders: ["gemini"],
    defaultProvider: "gemini",
    defaultModel: "text-embedding-004",
  },
];

export const PLATFORM_AI_USE_CASE_MAP = new Map(
  PLATFORM_AI_USE_CASES.map((entry) => [entry.id, entry]),
);

const CALL_TYPE_TO_USE_CASE = new Map<string, string>();

for (const useCase of PLATFORM_AI_USE_CASES) {
  for (const callType of useCase.callTypes) {
    if (!CALL_TYPE_TO_USE_CASE.has(callType)) {
      CALL_TYPE_TO_USE_CASE.set(callType, useCase.id);
    }
  }
}

export function getUseCaseDefinition(
  useCaseId: string,
): PlatformAiUseCaseDefinition | undefined {
  return PLATFORM_AI_USE_CASE_MAP.get(useCaseId);
}

export function resolveUseCaseIdForCallType(callType: string): string | null {
  return CALL_TYPE_TO_USE_CASE.get(callType) ?? null;
}

export const PLATFORM_AI_USE_CASE_CATEGORIES = [
  {
    id: "messaging" as const,
    label: "Сообщения",
  },
  {
    id: "voice" as const,
    label: "Голос",
  },
  {
    id: "background" as const,
    label: "Фоновые задачи",
  },
];
