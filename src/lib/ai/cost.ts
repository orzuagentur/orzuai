import type { AiProvider } from "@/lib/ai/constants";

type CostRates = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const COST_RATES: Record<AiProvider, CostRates> = {
  gemini: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  openai: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  claude: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
};

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateAiCostUsd(input: {
  provider: AiProvider;
  inputTokens: number;
  outputTokens: number;
}): number {
  const rates = COST_RATES[input.provider];
  const inputCost = (input.inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (input.outputTokens / 1_000_000) * rates.outputPerMillion;

  return Number((inputCost + outputCost).toFixed(6));
}
