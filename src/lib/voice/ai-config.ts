import "server-only";

import { getProviderAvailability } from "@/services/llm.service";

export function isVoiceAiConfigured(): boolean {
  const availability = getProviderAvailability();
  return availability.gemini || availability.openai || availability.claude;
}
