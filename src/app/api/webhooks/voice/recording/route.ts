import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { getVoiceRepository, type VoicePostCallJobType } from "@/repositories/voice.repository";
import { handleTwilioRecordingStatusUpdate } from "@/services/voice-recording.service";
import { dispatchVoicePostCallWorker } from "@/services/voice-post-call-queue.service";

const RECORDING_READY_JOB_TYPES: VoicePostCallJobType[] = [
  "transcribe",
  "summarize",
  "extract_actions",
];

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const params = await readTwilioRequestParams(request);
  const validation = await resolveTwilioWebhookValidationContext(businessId);

  if (
    !validation?.authToken ||
    !isTwilioWebhookSignatureValid({
      request,
      params,
      authToken: validation.authToken,
      businessId,
      expectedAccountSid: validation.expectedAccountSid,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const callSid = params.CallSid?.trim();
  const parentCallSid = request.nextUrl.searchParams.get("parentCallSid")?.trim();
  const recordingSid = params.RecordingSid?.trim();
  const recordingUrl = params.RecordingUrl?.trim();
  const recordingStatus = params.RecordingStatus?.trim();
  const callLogCallSid = parentCallSid || callSid;

  if (!callLogCallSid || !recordingSid || !recordingUrl || !recordingStatus) {
    return new NextResponse("Missing recording fields", { status: 400 });
  }

  const result = await handleTwilioRecordingStatusUpdate({
    businessId,
    callSid: callLogCallSid,
    recordingSid,
    recordingUrl,
    recordingStatus,
  });

  if (result.callLogId) {
    const repo = getVoiceRepository();

    await Promise.allSettled(
      RECORDING_READY_JOB_TYPES.map((jobType) =>
        repo.enqueuePostCallJob({
          businessId,
          callLogId: result.callLogId!,
          jobType,
          payload: {
            callSid: callLogCallSid,
            participantCallSid: callSid ?? null,
            recordingSid,
            recordingUrl,
          },
        }),
      ),
    );

    dispatchVoicePostCallWorker("enqueue");
  }

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
