import type { PlatformAiProvider } from "./providers";
import { getProviderLabel } from "./providers";

export type VercelAiSecretBinding = {
  envKey: string;
  provider: PlatformAiProvider;
  label: string;
};

/** Standard AI provider env keys synced from Vercel into General API AI. */
export const VERCEL_AI_SECRET_BINDINGS: VercelAiSecretBinding[] = [
  { envKey: "OPENAI_API_KEY", provider: "openai", label: "OpenAI" },
  { envKey: "GEMINI_API_KEY", provider: "gemini", label: "Google Gemini" },
  { envKey: "ANTHROPIC_API_KEY", provider: "claude", label: "Anthropic Claude" },
  { envKey: "ELEVENLABS_API_KEY", provider: "elevenlabs", label: "ElevenLabs" },
  { envKey: "DEEPGRAM_API_KEY", provider: "deepgram", label: "Deepgram" },
];

export function getVercelAiCredentialName(binding: VercelAiSecretBinding): string {
  return `${getProviderLabel(binding.provider)} (Vercel)`;
}

export const VERCEL_AI_SECRET_KEY_SET = new Set(
  VERCEL_AI_SECRET_BINDINGS.map((entry) => entry.envKey),
);
