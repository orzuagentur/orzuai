import "server-only";

import type { AiProvider } from "@/lib/ai/constants";
import { hasGeminiEnv } from "@/lib/env";
import { hasClaudeEnv } from "@/services/claude.service";
import { hasOpenAiEnv } from "@/services/openai.service";

/** Fast models tuned for realtime phone speech-to-speech. */
export const VOICE_STREAM_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  claude: "claude-3-5-haiku-latest",
};

export function resolveVoiceStreamLlm(
  preferredProvider: string,
  _configuredModel?: string | null,
): { provider: AiProvider; model: string } {
  const envProvider = process.env.VOICE_STREAM_LLM_PROVIDER?.trim().toLowerCase();
  const envModel = process.env.VOICE_STREAM_LLM_MODEL?.trim();

  if (
    envProvider &&
    envModel &&
    (envProvider === "openai" ||
      envProvider === "gemini" ||
      envProvider === "claude")
  ) {
    return { provider: envProvider, model: envModel };
  }

  if (envModel) {
    if (hasOpenAiEnv()) {
      return { provider: "openai", model: envModel };
    }
  }

  // OpenAI mini is the lowest-latency option for streaming voice replies.
  if (hasOpenAiEnv()) {
    return { provider: "openai", model: VOICE_STREAM_MODELS.openai };
  }

  const provider = preferredProvider as AiProvider;

  if (provider === "claude" && hasClaudeEnv()) {
    return { provider: "claude", model: VOICE_STREAM_MODELS.claude };
  }

  if (provider === "openai" && hasOpenAiEnv()) {
    return { provider: "openai", model: VOICE_STREAM_MODELS.openai };
  }

  if (hasGeminiEnv()) {
    return { provider: "gemini", model: VOICE_STREAM_MODELS.gemini };
  }

  if (hasClaudeEnv()) {
    return { provider: "claude", model: VOICE_STREAM_MODELS.claude };
  }

  return { provider: "gemini", model: VOICE_STREAM_MODELS.gemini };
}
