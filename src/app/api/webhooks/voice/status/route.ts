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
import { handleTwilioCallStatusUpdate } from "@/services/voice-inbox.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

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

  const callSid = params.CallSid?.trim();
  const callStatus = params.CallStatus?.trim();

  if (!callSid || !callStatus) {
    return new NextResponse("Missing call status", { status: 400 });
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
