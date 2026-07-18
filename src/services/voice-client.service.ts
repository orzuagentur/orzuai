import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import {
  createTwilioVoiceAccessToken,
} from "@/lib/twilio/access-token";
import {
  listTwilioIncomingPhoneNumbers,
  verifyTwilioApiKeyCredentials,
} from "@/lib/twilio/client";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
} from "@/lib/twilio/connect";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import { buildVoiceAgentClientIdentity } from "@/lib/twilio/client-identity";
import {
  buildDialClientTwiml,
  buildDialPhoneNumberTwiml,
  buildRecordingStatusCallbackUrl,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
} from "@/lib/voice/twiml";
import { requireUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import {
  getTwilioConnection,
  isBrowserPhoneSupportedForTwilioConnection,
  resolveTwilioBrowserPhoneRuntimeConfig,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { recordClientOutboundVoiceCall, markInboundCallAiFallback } from "@/services/voice-inbox.service";
import { resolveRecordingCallbackUrl } from "@/services/voice-recording.service";

export type VoiceClientConfig = {
  enabled: boolean;
  phoneNumber: string | null;
};

export async function getVoiceClientConfig(
  businessId: string,
): Promise<VoiceClientConfig> {
  const [connection, settings] = await Promise.all([
    getTwilioConnection(businessId),
    getVoiceAgentSettings(businessId),
  ]);

  const browserPhoneSupported =
    isBrowserPhoneSupportedForTwilioConnection(connection);

  const enabled =
    browserPhoneSupported && Boolean(settings.phoneNumber) && settings.outboundEnabled;

  return {
    enabled,
    phoneNumber: settings.phoneNumber || null,
  };
}

export async function createVoiceClientTokenForUser(input: {
  businessId: string;
  userId: string;
  agentMode?: boolean;
}): Promise<
  | { success: true; token: string; identity: string }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const connection = await getTwilioConnection(input.businessId);

  if (!isBrowserPhoneSupportedForTwilioConnection(connection)) {
    return {
      success: false,
      message:
        "Browser calling is not provisioned for this Twilio connection.",
    };
  }

  const browserPhone = await resolveTwilioBrowserPhoneRuntimeConfig(input.businessId);

  if (!browserPhone) {
    return {
      success: false,
      message: "Browser calling credentials are not configured.",
    };
  }

  const identity = buildVoiceAgentClientIdentity(input.businessId);

  const credentialCheck = await verifyTwilioApiKeyCredentials({
    accountSid: browserPhone.accountSid,
    apiKeySid: browserPhone.apiKeySid,
    apiKeySecret: browserPhone.apiKeySecret,
  });

  if (!credentialCheck.ok) {
    console.warn(
      "[voice-client] Twilio API key check failed before Access Token mint",
      JSON.stringify({
        businessId: input.businessId,
        accountSidPrefix: browserPhone.accountSid.slice(0, 10),
        apiKeySidPrefix: browserPhone.apiKeySid.slice(0, 10),
        message: credentialCheck.message,
      }),
    );

    return {
      success: false,
      message: credentialCheck.message,
    };
  }

  try {
    const token = createTwilioVoiceAccessToken({
      accountSid: browserPhone.accountSid,
      apiKeySid: browserPhone.apiKeySid,
      apiKeySecret: browserPhone.apiKeySecret,
      twimlAppSid: browserPhone.twimlAppSid,
      identity,
    });

    return { success: true, token, identity };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create voice client token.",
    };
  }
}

export async function getVoiceClientTokenForCurrentUser(
  agentMode = true,
): Promise<
  | { success: true; token: string; identity: string }
  | { success: false; message: string }
> {
  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const config = await getVoiceClientConfig(business.id);

  if (!config.enabled && !agentMode) {
    return { success: false, message: "Browser calling is not available." };
  }

  return createVoiceClientTokenForUser({
    businessId: business.id,
    userId: user.id,
    agentMode,
  });
}

function buildVoiceWebhookUrls(businessId: string) {
  return {
    statusCallbackUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
      businessId,
    ),
    customerLegStatusCallbackUrl: (parentCallSid: string) =>
      appendTwilioWebhookSignature(
        `${buildAppUrl("/api/webhooks/voice/customer-leg-status")}?businessId=${businessId}&parentCallSid=${encodeURIComponent(parentCallSid)}`,
        businessId,
      ),
    clientNoAnswerUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/client-no-answer")}?businessId=${businessId}`,
      businessId,
    ),
  };
}

function getConfiguredBrowserCallerId(): string | null {
  return (
    resolveSecretValue(ENV_KEYS.TWILIO_BROWSER_CALLER_ID)?.trim() || null
  );
}

function isDemoConferenceNumber(voiceUrl?: string | null): boolean {
  if (!voiceUrl) {
    return false;
  }

  const normalized = voiceUrl.toLowerCase();
  return (
    normalized.includes("conference") ||
    normalized.includes("demo.twilio.com") ||
    normalized.includes(".twil.io")
  );
}

async function resolveBrowserPhoneCallerId(
  preferredCallerId: string,
): Promise<string | null> {
  const accountSid = getTwilioPlatformAccountSid();
  const authToken = getTwilioPlatformAuthToken();

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const numbers = await listTwilioIncomingPhoneNumbers({
      accountSid,
      authToken,
    });
    const voiceNumbers = numbers.filter((number) => number.capabilities.voice);
    const configuredCallerId = getConfiguredBrowserCallerId();
    const configuredNumber = configuredCallerId
      ? voiceNumbers.find((number) => number.phoneNumber === configuredCallerId)
      : null;
    const nonDemoNumbers = voiceNumbers.filter(
      (number) => !isDemoConferenceNumber(number.voiceUrl),
    );

    return (
      configuredNumber?.phoneNumber ??
      voiceNumbers.find((number) => number.phoneNumber === preferredCallerId)
        ?.phoneNumber ??
      nonDemoNumbers[0]?.phoneNumber ??
      voiceNumbers[0]?.phoneNumber ??
      null
    );
  } catch (error) {
    console.error(
      "[voice-client] browser caller id lookup failed",
      JSON.stringify({
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return null;
  }
}

async function resolveSoftphoneCallerId(input: {
  browserPhone: NonNullable<
    Awaited<ReturnType<typeof resolveTwilioBrowserPhoneRuntimeConfig>>
  >;
  preferredCallerId: string;
}): Promise<{ callerId: string; dialAccount: "platform" | "customer" } | null> {
  const callerId = await resolveBrowserPhoneOutboundCallerId({
    mode: input.browserPhone.mode,
    preferredCallerId: input.preferredCallerId,
  });

  if (!callerId) {
    return null;
  }

  return {
    callerId,
    dialAccount: input.browserPhone.mode === "customer" ? "customer" : "platform",
  };
}

async function resolveBrowserPhoneOutboundCallerId(input: {
  mode: "platform" | "customer";
  preferredCallerId: string;
}): Promise<string | null> {
  if (input.mode === "customer") {
    return input.preferredCallerId.trim() || null;
  }

  return resolveBrowserPhoneCallerId(input.preferredCallerId);
}

export async function buildClientOutboundTwiml(input: {
  businessId: string;
  toNumber: string;
  callSid?: string | null;
}): Promise<string> {
  const settings = await getVoiceAgentSettings(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);
  const phoneNumber = settings.phoneNumber?.trim();

  if (!phoneNumber) {
    return buildStaticSayTwiml({
      speech: "Business phone number is not configured.",
      speechLocale,
    });
  }

  const to = input.toNumber.trim();

  if (!to || to.length < 8) {
    return buildStaticSayTwiml({
      speech: "Invalid destination phone number.",
      speechLocale,
    });
  }

  if (!input.callSid?.trim()) {
    return buildStaticSayTwiml({
      speech: "Browser call session is missing.",
      speechLocale,
    });
  }

  const parentCallSid = input.callSid.trim();
  const recordingCallback = settings.recordingEnabled
    ? buildRecordingStatusCallbackUrl(input.businessId, parentCallSid)
    : null;
  const callLog = await recordClientOutboundVoiceCall({
    businessId: input.businessId,
    phoneNumber: to,
    callSid: parentCallSid,
  });

  const browserPhone = await resolveTwilioBrowserPhoneRuntimeConfig(input.businessId);

  if (!browserPhone) {
    return buildStaticSayTwiml({
      speech: "Browser calling is not provisioned for this Twilio connection.",
      speechLocale,
    });
  }

  const customerLeg = await resolveSoftphoneCallerId({
    browserPhone,
    preferredCallerId: phoneNumber,
  });

  if (!customerLeg) {
    return buildStaticSayTwiml({
      speech: "Browser calling is missing a valid caller ID on the OrzuX platform Twilio account.",
      speechLocale,
    });
  }

  // Direct Dial keeps operator + customer on the same Client call account.
  // Conference REST legs previously split Connect vs platform and never bridged.
  console.info(
    "[voice-client] softphone direct dial",
    JSON.stringify({
      businessId: input.businessId,
      parentCallSid,
      callLogId: callLog.callLogId,
      dialAccount: customerLeg.dialAccount,
      from: customerLeg.callerId,
      to,
    }),
  );

  return buildDialPhoneNumberTwiml({
    callerId: customerLeg.callerId,
    toNumber: to,
    recordingStatusCallback: recordingCallback,
  });
}

export async function buildInboundBrowserTwiml(
  businessId: string,
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);
  const webhooks = buildVoiceWebhookUrls(businessId);

  const recordingCallback = await resolveRecordingCallbackUrl(businessId);

  return buildDialClientTwiml({
    clientIdentity: buildVoiceAgentClientIdentity(businessId),
    timeoutSeconds: 25,
    actionUrl: webhooks.clientNoAnswerUrl,
    speechLocale,
    recordingStatusCallback: recordingCallback,
  });
}

export async function buildClientNoAnswerTwiml(
  businessId: string,
  callSid?: string | null,
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  if (settings.aiEnabled && settings.aiConfigured) {
    if (callSid?.trim()) {
      await markInboundCallAiFallback(businessId, callSid.trim());
    }

    const { buildVoiceConversationTwiml } = await import(
      "@/services/voice-ai.service"
    );

    return buildVoiceConversationTwiml({
      businessId,
      direction: "inbound",
      forceAi: true,
      callSid: callSid?.trim() || null,
    });
  }

  return buildStaticSayTwiml({
    speech: settings.inboundGreeting,
    speechLocale,
  });
}
