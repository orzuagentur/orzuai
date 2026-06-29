import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { handleVoiceGatherInput } from "@/services/voice-ai.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  const directionParam = request.nextUrl.searchParams.get("direction");
  const triggerReason = request.nextUrl.searchParams.get("triggerReason");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const params = await readTwilioRequestParams(request);
  const connection = await getTwilioConnection(businessId);
  const credentials = resolveTwilioCredentialsForBusiness(connection);
  const authToken =
    credentials?.authToken ?? getTwilioPlatformAuthToken() ?? null;

  if (
    !isTwilioWebhookSignatureValid({
      request,
      params,
      authToken,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const direction = directionParam === "outbound" ? "outbound" : "inbound";
  const speechResult = params.SpeechResult ?? "";
  const callSid = params.CallSid ?? "unknown";
  const callerPhone = params.From ?? params.To ?? "";

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
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
