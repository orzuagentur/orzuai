import "server-only";

import { cancelOutboundVoiceCall } from "@/services/voice-outbound-cancel.service";
import { buildStaticSayTwiml, mapVoiceLanguageToTwilioLocale } from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
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
  callLogId?: string;
  parentCallSid?: string;
}): Promise<{ success: boolean; message?: string }> {
  return cancelOutboundVoiceCall({
    businessId: input.businessId,
    callLogId: input.callLogId,
    parentCallSid: input.parentCallSid,
    reason: "manual_end",
  });
}

export async function transferActiveVoiceCallToAgent(input: {
  businessId: string;
  callLogId: string;
}): Promise<{ success: boolean; message?: string }> {
  return handoffActiveVoiceCallToAgent(input);
}
