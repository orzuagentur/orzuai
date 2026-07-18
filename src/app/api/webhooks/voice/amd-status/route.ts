import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { bindVoiceCallLogToTwilioCall } from "@/services/voice-agent.service";
import { handleTwilioAmdStatusUpdate } from "@/services/voice-ai-outbound-guard.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId")?.trim() || "";

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const params = await readTwilioRequestParams(request);
  const validation = await resolveTwilioWebhookValidationContext(businessId);

  if (
    !validation ||
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
  const answeredBy = params.AnsweredBy?.trim();
  const callLogId = request.nextUrl.searchParams.get("callLogId");

  if (!callSid || !answeredBy) {
    return new NextResponse("Missing AMD status", { status: 400 });
  }

  if (callLogId) {
    try {
      await bindVoiceCallLogToTwilioCall({
        businessId,
        callLogId,
        callSid,
        callMode: "ai",
      });
    } catch (error) {
      console.warn(
        "[voice-webhook] AMD CallSid bind failed",
        JSON.stringify({
          businessId,
          callLogId,
          callSid,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  await handleTwilioAmdStatusUpdate({
    businessId,
    callSid,
    answeredBy,
    machineDetectionDuration: params.MachineDetectionDuration?.trim() || null,
  });

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
