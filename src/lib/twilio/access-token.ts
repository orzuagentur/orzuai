import "server-only";

import twilio from "twilio";

import { ENV_KEYS } from "@/constants/env-keys";
import { resolveSecretValue } from "@/lib/secrets/resolver";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

export function getTwilioApiKeySid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_API_KEY_SID)?.trim() || undefined;
}

export function getTwilioVoiceAccountSid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_ACCOUNT_SID)?.trim() || undefined;
}

export function getTwilioApiKeySecret(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_API_KEY_SECRET)?.trim() || undefined;
}

export function getTwilioTwimlAppSid(): string | undefined {
  return resolveSecretValue(ENV_KEYS.TWILIO_TWIML_APP_SID)?.trim() || undefined;
}

export function hasTwilioVoiceClientEnv(): boolean {
  return Boolean(
    getTwilioVoiceAccountSid() &&
      getTwilioApiKeySid() &&
      getTwilioApiKeySecret() &&
      getTwilioTwimlAppSid(),
  );
}

export function createTwilioVoiceAccessToken(input: {
  accountSid: string;
  identity: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  twimlAppSid?: string;
  ttlSeconds?: number;
}): string {
  const apiKeySid = input.apiKeySid?.trim() || getTwilioApiKeySid();
  const apiKeySecret =
    input.apiKeySecret?.trim() || getTwilioApiKeySecret();
  const twimlAppSid = input.twimlAppSid?.trim() || getTwilioTwimlAppSid();

  if (!apiKeySid || !apiKeySecret || !twimlAppSid) {
    throw new Error("Twilio Voice Client is not configured.");
  }

  const token = new AccessToken(
    input.accountSid,
    apiKeySid,
    apiKeySecret,
    {
      identity: input.identity,
      ttl: input.ttlSeconds ?? 3600,
    },
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);

  return token.toJwt();
}
