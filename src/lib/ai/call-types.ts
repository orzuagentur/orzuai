export const AI_CALL_TYPES = [
  "auto_reply",
  "orchestrator",
  "sentiment",
  "bant",
  "follow_up",
  "automation",
  "intent",
  "crm_plan",
  "analytics",
  "conversation_summary",
  "voice",
  "voice_stt",
  "voice_tts",
  "other",
] as const;

export type AiCallType = (typeof AI_CALL_TYPES)[number];

/** Customer-facing calls enforce monthly plan limits. */
export const CUSTOMER_FACING_AI_CALL_TYPES = new Set<AiCallType>([
  "auto_reply",
  "orchestrator",
  "follow_up",
]);

export const DEFAULT_LLM_FALLBACK_PROVIDERS = [
  "gemini",
  "openai",
  "claude",
] as const;
