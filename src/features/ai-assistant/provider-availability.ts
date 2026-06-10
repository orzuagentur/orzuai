import type { AiProvider } from "@/lib/ai/constants";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type { AiProviderAvailability } from "@/types/channel-workspace.types";

export type ProviderKeySource = "business" | "platform" | "none";

export function mergeProviderAvailability(
  platform: AiProviderAvailability,
  businessCredentials: BusinessProviderCredential[],
): AiProviderAvailability {
  const result = { ...platform };

  for (const credential of businessCredentials) {
    if (credential.configured) {
      result[credential.provider] = true;
    }
  }

  return result;
}

export function getProviderKeySource(
  provider: AiProvider,
  platform: AiProviderAvailability,
  businessCredentials: BusinessProviderCredential[],
): ProviderKeySource {
  if (
    businessCredentials.some(
      (credential) => credential.provider === provider && credential.configured,
    )
  ) {
    return "business";
  }

  if (platform[provider]) {
    return "platform";
  }

  return "none";
}
