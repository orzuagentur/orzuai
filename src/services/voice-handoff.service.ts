import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { buildVoiceAgentClientIdentity } from "@/lib/twilio/client-identity";
import { redirectTwilioCall } from "@/lib/twilio/client";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import {
  buildHandoffToAgentTwiml,
  buildRecordingStatusCallbackUrl,
  mapVoiceLanguageToTwilioLocale,
} from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import {
  getTwilioConnection,
  isBrowserPhoneSupportedForTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

export async function buildHandoffAgentTwiml(
  businessId: string,
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);
  const recordingCallback = settings.recordingEnabled
    ? buildRecordingStatusCallbackUrl(businessId)
    : null;

  return buildHandoffToAgentTwiml({
    speechLocale,
    clientIdentity: buildVoiceAgentClientIdentity(businessId),
    actionUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/client-no-answer")}?businessId=${businessId}`,
      businessId,
    ),
    recordingStatusCallback: recordingCallback,
  });
}

export async function handoffActiveVoiceCallToAgent(input: {
  businessId: string;
  callLogId: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const connection = await getTwilioConnection(input.businessId);

  if (!isBrowserPhoneSupportedForTwilioConnection(connection)) {
    return {
      success: false,
      message: "Browser calling is not provisioned for this Twilio connection.",
    };
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogById(input.businessId, input.callLogId);

  if (!callLog?.external_call_id) {
    return { success: false, message: "Call not found or not active." };
  }

  if (!isActiveVoiceCallStatus(callLog.status)) {
    return { success: false, message: "Call is no longer active." };
  }

  const credentials = await resolveTwilioCredentialsForBusiness(connection);

  if (!credentials?.accountSid || !credentials.authToken) {
    return { success: false, message: "Twilio credentials missing." };
  }

  const handoffUrl = appendTwilioWebhookSignature(
    `${buildAppUrl("/api/webhooks/voice/handoff")}?businessId=${input.businessId}`,
    input.businessId,
  );

  try {
    await redirectTwilioCall({
      credentials,
      callSid: callLog.external_call_id,
      url: handoffUrl,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Unable to transfer call.",
    };
  }

  await repo.updateCallLog(callLog.id, {
    aiHandled: false,
    humanHandled: true,
    handoffAt: new Date().toISOString(),
  });

  return { success: true };
}

export async function markVoiceCallHandoffByCallSid(callSid: string): Promise<void> {
  if (!hasSupabaseEnv() || !callSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(callSid);

  if (!callLog) {
    return;
  }

  await repo.updateCallLog(callLog.id, {
    aiHandled: false,
    humanHandled: true,
    handoffAt: new Date().toISOString(),
  });
}
