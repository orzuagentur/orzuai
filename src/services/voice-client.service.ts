import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import {
  createTwilioVoiceAccessToken,
  hasTwilioVoiceClientEnv,
} from "@/lib/twilio/access-token";
import {
  createTwilioOutboundCallWithTwiml,
  listTwilioIncomingPhoneNumbers,
  type TwilioApiCredentials,
  TwilioApiRequestError,
  verifyTwilioApiKeyCredentials,
} from "@/lib/twilio/client";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
} from "@/lib/twilio/connect";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import { buildVoiceAgentClientIdentity } from "@/lib/twilio/client-identity";
import {
  buildConferenceStatusCallbackUrl,
  buildDialConferenceTwiml,
  buildDialClientTwiml,
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
import { recordCustomerOutboundLeg } from "@/services/voice-outbound-cancel.service";
import { resolveRecordingCallbackUrl } from "@/services/voice-recording.service";

const CONFERENCE_WAIT_URL =
  "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical";

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
    connection?.authMode === "api_key"
      ? isBrowserPhoneSupportedForTwilioConnection(connection)
      : hasTwilioVoiceClientEnv() &&
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

function buildOutboundConferenceName(input: {
  businessId: string;
  callSid: string;
}): string {
  const businessPart = input.businessId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const callPart = input.callSid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 34);
  return `orzux-${businessPart}-${callPart}`.slice(0, 80);
}

function resolveOutboundCustomerLegErrorSpeech(error: unknown): string {
  if (error instanceof TwilioApiRequestError) {
    const message = error.message.toLowerCase();

    if (
      error.code === 21215
      || message.includes("not allowed to call")
      || message.includes("geo permission")
    ) {
      return "This destination country is blocked in Twilio Geo Permissions. Open Twilio Console, Voice, Geo Permissions, and enable the destination country.";
    }

    if (error.code === 21211 || message.includes("invalid 'to' phone number")) {
      return "The destination phone number is invalid.";
    }

    if (
      error.code === 13227
      || message.includes("unverified")
      || message.includes("verified numbers")
    ) {
      return "Twilio trial accounts can only call verified numbers. Verify the destination number in Twilio Console or upgrade the account.";
    }

    if (message.includes("fraud") || message.includes("blocked")) {
      return "Twilio blocked this outbound call. Check Twilio Monitor alerts and Fraud Guard settings.";
    }

    return `Unable to connect the customer call. ${error.message}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return `Unable to connect the customer call. ${error.message}`;
  }

  return "Unable to connect the customer call.";
}

function buildBrowserPhoneRestCredentials(
  config: Awaited<ReturnType<typeof resolveTwilioBrowserPhoneRuntimeConfig>>,
): TwilioApiCredentials | null {
  if (!config) {
    return null;
  }

  if (config.mode === "customer") {
    return {
      accountSid: config.accountSid,
      authToken: config.authToken,
      apiKeySid: config.apiKeySid,
      apiKeySecret: config.apiKeySecret,
    };
  }

  return {
    accountSid: config.accountSid,
    authToken: config.authToken,
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
  const conferenceName = buildOutboundConferenceName({
    businessId: input.businessId,
    callSid: parentCallSid,
  });
  const conferenceStatusCallback = buildConferenceStatusCallbackUrl({
    businessId: input.businessId,
    parentCallSid,
  });
  const recordingCallback = settings.recordingEnabled
    ? buildRecordingStatusCallbackUrl(input.businessId, parentCallSid)
    : null;
  const webhooks = buildVoiceWebhookUrls(input.businessId);
  const callLog = await recordClientOutboundVoiceCall({
    businessId: input.businessId,
    phoneNumber: to,
    callSid: parentCallSid,
  });

  const browserPhone = await resolveTwilioBrowserPhoneRuntimeConfig(input.businessId);
  const browserCredentials = buildBrowserPhoneRestCredentials(browserPhone);

  if (!browserPhone || !browserCredentials) {
    return buildStaticSayTwiml({
      speech: "Browser calling is not provisioned for this Twilio connection.",
      speechLocale,
    });
  }

  const browserCallerId = await resolveBrowserPhoneOutboundCallerId({
    mode: browserPhone.mode,
    preferredCallerId: phoneNumber,
  });

  if (!browserCallerId) {
    return buildStaticSayTwiml({
      speech: "Browser calling is missing a valid caller ID.",
      speechLocale,
    });
  }

  const customerTwiml = buildDialConferenceTwiml({
    conferenceName,
    participantLabel: "customer",
    statusCallbackUrl: conferenceStatusCallback,
    startConferenceOnEnter: false,
    endConferenceOnExit: true,
    waitUrl: CONFERENCE_WAIT_URL,
  });

  try {
    const customerCallSid = await createTwilioOutboundCallWithTwiml({
      credentials: browserCredentials,
      from: browserCallerId,
      to,
      twiml: customerTwiml,
      statusCallbackUrl: webhooks.customerLegStatusCallbackUrl(parentCallSid),
    });

    console.info(
      "[voice-client] conference customer leg created",
      JSON.stringify({
        businessId: input.businessId,
        parentCallSid,
        customerCallSid,
        callLogId: callLog.callLogId,
      }),
    );

    await recordCustomerOutboundLeg({
      businessId: input.businessId,
      callLogId: callLog.callLogId,
      parentCallSid,
      customerCallSid,
      phoneNumber: to,
    });
  } catch (error) {
    console.error(
      "[voice-client] conference customer leg failed",
      JSON.stringify({
        businessId: input.businessId,
        parentCallSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return buildStaticSayTwiml({
      speech: resolveOutboundCustomerLegErrorSpeech(error),
      speechLocale,
    });
  }

  return buildDialConferenceTwiml({
    conferenceName,
    participantLabel: "operator",
    statusCallbackUrl: conferenceStatusCallback,
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
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
