import "server-only";

import { buildRecordingStatusCallbackUrl, withCallRecording } from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getVoiceAgentSettings } from "@/services/voice-config.service";

export async function resolveRecordingCallbackUrl(
  businessId: string,
): Promise<string | null> {
  const settings = await getVoiceAgentSettings(businessId);

  if (!settings.recordingEnabled) {
    return null;
  }

  return buildRecordingStatusCallbackUrl(businessId);
}

export async function applyCallRecordingToTwiml(
  businessId: string,
  twiml: string,
): Promise<string> {
  const callbackUrl = await resolveRecordingCallbackUrl(businessId);
  return withCallRecording(twiml, callbackUrl);
}

export async function handleTwilioRecordingStatusUpdate(input: {
  businessId: string;
  callSid: string;
  recordingSid: string;
  recordingUrl: string;
  recordingStatus: string;
}): Promise<void> {
  if (!hasSupabaseEnv() || input.recordingStatus !== "completed") {
    return;
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.callSid);

  if (!callLog) {
    return;
  }

  await repo.updateCallLog(callLog.id, {
    recordingUrl: input.recordingUrl,
    recordingSid: input.recordingSid,
  });
}
