import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import {
  createTwilioVoiceAccessToken,
  getTwilioVoiceAccountSid,
  hasTwilioVoiceClientEnv,
} from "@/lib/twilio/access-token";
import { listTwilioIncomingPhoneNumbers } from "@/lib/twilio/client";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
} from "@/lib/twilio/connect";
import { buildVoiceAgentClientIdentity } from "@/lib/twilio/client-identity";
import {
  buildDialClientTwiml,
  buildDialPhoneNumberTwiml,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
} from "@/lib/voice/twiml";
import { requireUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import {
  getTwilioConnection,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { recordClientOutboundVoiceCall } from "@/services/voice-inbox.service";
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

  const twilioConnected = connection?.status === "connected";
  const enabled =
    hasTwilioVoiceClientEnv() &&
    twilioConnected &&
    Boolean(settings.phoneNumber) &&
    settings.outboundEnabled;

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

  if (!hasTwilioVoiceClientEnv()) {
    return {
      success: false,
      message: "Browser calling is not configured on this platform.",
    };
  }

  const connection = await getTwilioConnection(input.businessId);

  if (!connection || connection.status !== "connected") {
    return { success: false, message: "Twilio is not connected." };
  }

  const voiceTokenAccountSid = getTwilioVoiceAccountSid();

  if (!voiceTokenAccountSid) {
    return {
      success: false,
      message: "Twilio Voice account SID is not configured.",
    };
  }

  const identity = buildVoiceAgentClientIdentity(input.businessId);

  try {
    const token = createTwilioVoiceAccessToken({
      accountSid: voiceTokenAccountSid,
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
    statusCallbackUrl: `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
    clientNoAnswerUrl: `${buildAppUrl("/api/webhooks/voice/client-no-answer")}?businessId=${businessId}`,
  };
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

    return (
      voiceNumbers.find((number) => number.phoneNumber === preferredCallerId)
        ?.phoneNumber ??
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

  if (input.callSid) {
    await recordClientOutboundVoiceCall({
      businessId: input.businessId,
      phoneNumber: to,
      callSid: input.callSid,
    });
  }

  const browserCallerId = await resolveBrowserPhoneCallerId(phoneNumber);

  if (!browserCallerId) {
    return buildStaticSayTwiml({
      speech: "Browser calling is missing a valid caller ID.",
      speechLocale,
    });
  }

  return buildDialPhoneNumberTwiml({
    callerId: browserCallerId,
    toNumber: to,
    recordingStatusCallback: await resolveRecordingCallbackUrl(input.businessId),
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
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  return buildStaticSayTwiml({
    speech: settings.inboundGreeting,
    speechLocale,
  });
}
