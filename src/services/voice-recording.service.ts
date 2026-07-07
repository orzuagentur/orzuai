import "server-only";

import { buildRecordingStatusCallbackUrl, withCallRecording } from "@/lib/voice/twiml";
import {
  buildTwilioApiAuthorizationHeader,
  hasTwilioApiCredentials,
} from "@/lib/twilio/client";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";

const MAX_RECORDING_DOWNLOAD_BYTES = 25 * 1024 * 1024;

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
}): Promise<{ callLogId: string | null }> {
  if (!hasSupabaseEnv() || input.recordingStatus !== "completed") {
    return { callLogId: null };
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.callSid);

  if (!callLog) {
    return { callLogId: null };
  }

  if (callLog.business_id !== input.businessId) {
    console.warn(
      "[voice-recording] ignored recording update for mismatched business",
      JSON.stringify({
        expectedBusinessId: callLog.business_id,
        receivedBusinessId: input.businessId,
        callSid: input.callSid,
        recordingSid: input.recordingSid,
      }),
    );
    return { callLogId: null };
  }

  await repo.updateCallLog(callLog.id, {
    recordingUrl: input.recordingUrl,
    recordingSid: input.recordingSid,
  });

  return { callLogId: callLog.id };
}

export async function downloadTwilioRecordingAudio(input: {
  businessId: string;
  recordingUrl: string;
}): Promise<
  | { success: true; buffer: Buffer; mimeType: string; fileName: string }
  | { success: false; message: string }
> {
  const connection = await getTwilioConnection(input.businessId);
  const credentials = await resolveTwilioCredentialsForBusiness(connection);

  if (!hasTwilioApiCredentials(credentials)) {
    return { success: false, message: "Twilio credentials missing." };
  }

  const recordingUrl = input.recordingUrl.endsWith(".mp3")
    ? input.recordingUrl
    : `${input.recordingUrl}.mp3`;
  const response = await fetch(recordingUrl, {
    headers: { Authorization: buildTwilioApiAuthorizationHeader(credentials) },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      success: false,
      message: `Unable to fetch recording (${response.status}).`,
    };
  }

  const contentLength = Number.parseInt(
    response.headers.get("Content-Length") ?? "0",
    10,
  );

  if (contentLength > MAX_RECORDING_DOWNLOAD_BYTES) {
    return {
      success: false,
      message: "Recording is too large for transcription.",
    };
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_RECORDING_DOWNLOAD_BYTES) {
    return {
      success: false,
      message: "Recording is too large for transcription.",
    };
  }

  return {
    success: true,
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get("Content-Type") ?? "audio/mpeg",
    fileName: "twilio-call-recording.mp3",
  };
}
