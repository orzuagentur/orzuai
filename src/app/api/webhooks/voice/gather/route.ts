import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { runVoiceTwimlWebhook } from "@/lib/voice/webhook-handler";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { handleVoiceGatherInput } from "@/services/voice-ai.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  const directionParam = request.nextUrl.searchParams.get("direction");
  const triggerReason = request.nextUrl.searchParams.get("triggerReason");

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

  const direction = directionParam === "outbound" ? "outbound" : "inbound";
  const speechResult = params.SpeechResult ?? "";
  const callSid = params.CallSid ?? "unknown";
  const callerPhone = params.From ?? params.To ?? "";

  return runVoiceTwimlWebhook(async () => {
    const twiml = await handleVoiceGatherInput({
      businessId,
      callSid,
      direction,
      speechResult,
      triggerReason,
      callerPhone: callerPhone || null,
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }, {
    route: "gather",
    businessId,
    callSid,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
