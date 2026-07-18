import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";

/** OrzuX platform Twilio account (owns all customer DIDs). */
export function getTwilioPlatformAccountSid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_ACCOUNT_SID)?.trim() || undefined;
}

export function getTwilioPlatformAuthToken(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_AUTH_TOKEN)?.trim() || undefined;
}

export function hasTwilioPlatformEnv(): boolean {
  return Boolean(getTwilioPlatformAccountSid() && getTwilioPlatformAuthToken());
}
