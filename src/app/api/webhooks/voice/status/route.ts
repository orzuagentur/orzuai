import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { bindVoiceCallLogToTwilioCall } from "@/services/voice-agent.service";
import { handleTwilioCallStatusUpdate } from "@/services/voice-inbox.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

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
  const callStatus = params.CallStatus?.trim();
  const callLogId = request.nextUrl.searchParams.get("callLogId");

  if (!callSid || !callStatus) {
    return new NextResponse("Missing call status", { status: 400 });
  }

  if (callLogId) {
    try {
      await bindVoiceCallLogToTwilioCall({
        businessId,
        callLogId,
        callSid,
        triggerReason: request.nextUrl.searchParams.get("triggerReason"),
      });
    } catch (error) {
      console.warn(
        "[voice-webhook] status CallSid bind failed",
        JSON.stringify({
          businessId,
          callLogId,
          callSid,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  await handleTwilioCallStatusUpdate({
    businessId,
    callSid,
    callStatus,
    callDuration: params.CallDuration?.trim() || null,
    direction: params.Direction?.trim() || null,
    from: params.From?.trim() || null,
    to: params.To?.trim() || null,
  });

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
