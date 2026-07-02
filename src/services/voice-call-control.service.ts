import "server-only";

import { completeTwilioCall } from "@/lib/twilio/client";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
} from "@/lib/twilio/connect";
import { buildStaticSayTwiml, mapVoiceLanguageToTwilioLocale } from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { handoffActiveVoiceCallToAgent } from "@/services/voice-handoff.service";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

export async function findBusinessLineBusyCall(input: {
  businessId: string;
  phoneNumber?: string;
  excludeCallLogId?: string;
}): Promise<{ busy: boolean; activeCallId?: string; activePhoneNumber?: string }> {
  if (!hasSupabaseEnv()) {
    return { busy: false };
  }

  const repo = getVoiceRepository();
  const activeCall = await repo.findActiveCallForBusiness(input.businessId, {
    phoneNumber: input.phoneNumber,
    excludeCallLogId: input.excludeCallLogId,
  });

  if (!activeCall || !isActiveVoiceCallStatus(activeCall.status)) {
    return { busy: false };
  }

  return {
    busy: true,
    activeCallId: activeCall.id,
    activePhoneNumber: activeCall.phone_number,
  };
}

export async function buildBusinessLineBusyTwiml(
  businessId: string,
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  return buildStaticSayTwiml({
    speech: "This line is busy. Please try again in a few minutes.",
    speechLocale,
  });
}

export async function endActiveVoiceCall(input: {
  businessId: string;
  callLogId: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogById(input.businessId, input.callLogId);

  if (!callLog?.external_call_id) {
    return { success: false, message: "Call not found." };
  }

  if (!isActiveVoiceCallStatus(callLog.status)) {
    return { success: false, message: "Call is no longer active." };
  }

  const connection = await getTwilioConnection(input.businessId);
  const resolved = resolveTwilioCredentialsForBusiness(connection);
  const platformAccountSid = getTwilioPlatformAccountSid();
  const platformAuthToken = getTwilioPlatformAuthToken();
  const credentials =
    resolved ??
    (platformAccountSid && platformAuthToken
      ? { accountSid: platformAccountSid, authToken: platformAuthToken }
      : null);

  if (!credentials?.accountSid || !credentials.authToken) {
    return { success: false, message: "Twilio credentials missing." };
  }

  try {
    await completeTwilioCall({
      credentials,
      callSid: callLog.external_call_id,
    });
  } catch (error) {
    const twilioMessage =
      error instanceof Error ? error.message.slice(0, 200) : "Unable to end call.";

    if (/not found|404|invalid/i.test(twilioMessage)) {
      await repo.updateCallLog(callLog.id, {
        status: "completed",
        endedAt: new Date().toISOString(),
      });

      return { success: true, message: "Call already ended." };
    }

    return {
      success: false,
      message: twilioMessage,
    };
  }

  await repo.updateCallLog(callLog.id, {
    status: "completed",
    endedAt: new Date().toISOString(),
  });

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: callLog.id,
    callSid: callLog.external_call_id,
    eventType: "call.ended_by_operator",
    actorType: "operator",
    payload: { reason: "manual_end" },
  });

  return { success: true };
}

export async function transferActiveVoiceCallToAgent(input: {
  businessId: string;
  callLogId: string;
}): Promise<{ success: boolean; message?: string }> {
  return handoffActiveVoiceCallToAgent(input);
}
