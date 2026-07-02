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
import { handleTwilioAmdStatusUpdate } from "@/services/voice-ai-outbound-guard.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId")?.trim() || "";

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
      businessId,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const callSid = params.CallSid?.trim();
  const answeredBy = params.AnsweredBy?.trim();

  if (!callSid || !answeredBy) {
    return new NextResponse("Missing AMD status", { status: 400 });
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
