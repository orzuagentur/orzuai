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
import { buildClientNoAnswerTwiml } from "@/services/voice-client.service";

export async function POST(request: NextRequest) {
  const params = await readTwilioRequestParams(request);
  const businessId =
    request.nextUrl.searchParams.get("businessId")?.trim() ||
    params.businessId?.trim() ||
    "";

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

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

  const twiml = await buildClientNoAnswerTwiml(
    businessId,
    params.CallSid?.trim() || null,
  );

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
