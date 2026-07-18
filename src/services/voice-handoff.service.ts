import "server-only";

import { buildAppUrl } from "@/lib/app-url";
import { redirectTwilioCall } from "@/lib/twilio/client";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import {
  buildHandoffToNumberTwiml,
  buildRecordingStatusCallbackUrl,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
} from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getActiveOrzuVoiceNumber } from "@/services/orzu-voice-numbers.service";
import {
  getTwilioConnection,
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
  const orzuNumber = await getActiveOrzuVoiceNumber(businessId);
  const forwardTo = orzuNumber?.forwardToE164?.trim();
  const callerId = settings.phoneNumber?.trim() || orzuNumber?.phoneNumber;

  if (!forwardTo || !callerId) {
    return buildStaticSayTwiml({
      speech:
        "A team member is not available right now. Please leave a message after the tone or call back later.",
      speechLocale,
    });
  }

  return buildHandoffToNumberTwiml({
    speechLocale,
    callerId,
    toNumber: forwardTo,
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

  const orzuNumber = await getActiveOrzuVoiceNumber(input.businessId);

  if (!orzuNumber?.forwardToE164?.trim()) {
    return {
      success: false,
      message: "Set your personal forward-to number in Voice setup first.",
    };
  }

  const connection = await getTwilioConnection(input.businessId);
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
