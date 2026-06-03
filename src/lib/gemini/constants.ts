export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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
