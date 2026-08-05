export const AI_INTENSITY_VALUES = ["light", "full"] as const;

export type AiIntensity = (typeof AI_INTENSITY_VALUES)[number];

export function parseAiIntensity(value: unknown): AiIntensity {
  return value === "full" ? "full" : "light";
}

/** Light mode: fast reply + orchestrator only (skip BANT, rolling summary LLM). */
export function shouldDeferExtraInboundLlmCalls(intensity: AiIntensity): boolean {
  return intensity === "light";
}
