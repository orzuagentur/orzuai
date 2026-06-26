type CostRates = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const COST_RATES: Record<string, CostRates> = {
  gemini: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  openai: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  claude: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  // ElevenLabs Turbo v2: ~$0.30 per 1,000 characters (inputTokens stores chars).
  elevenlabs: { inputPerMillion: 300, outputPerMillion: 0 },
};

const DEFAULT_COST_RATES: CostRates = {
  inputPerMillion: 0.15,
  outputPerMillion: 0.6,
};

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** OpenAI Whisper: $0.006 per minute (as of 2025). */
export const WHISPER_COST_PER_MINUTE_USD = 0.006;

export function estimateAudioDurationSeconds(
  byteLength: number,
  mimeType: string,
): number {
  const normalized = mimeType.toLowerCase().split(";")[0]!.trim();
  const bitsPerSecond =
    normalized.includes("ogg") || normalized.includes("opus") ? 32_000 : 64_000;

  return Math.max(1, Math.ceil((byteLength * 8) / bitsPerSecond));
}

export function estimateWhisperCostUsd(durationSeconds: number): number {
  return Number(
    ((durationSeconds / 60) * WHISPER_COST_PER_MINUTE_USD).toFixed(6),
  );
}

export function estimateAiCostUsd(input: {
  provider: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const rates = COST_RATES[input.provider] ?? DEFAULT_COST_RATES;
  const inputCost = (input.inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (input.outputTokens / 1_000_000) * rates.outputPerMillion;

  return Number((inputCost + outputCost).toFixed(6));
}
