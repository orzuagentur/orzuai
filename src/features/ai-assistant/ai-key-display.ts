import { AI_PROVIDER_LABELS } from "@/lib/ai/constants";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";

export function getAiKeyDisplayName(
  credential: Pick<BusinessProviderCredential, "keyName" | "provider">,
): string {
  const trimmed = credential.keyName?.trim();

  if (trimmed) {
    return trimmed;
  }

  return AI_PROVIDER_LABELS[credential.provider];
}

export function getAiKeyProviderLabel(
  credential: Pick<BusinessProviderCredential, "provider">,
): string {
  return AI_PROVIDER_LABELS[credential.provider];
}
