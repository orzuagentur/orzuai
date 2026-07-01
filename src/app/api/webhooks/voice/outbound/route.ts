import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import { runVoiceTwimlWebhook } from "@/lib/voice/webhook-handler";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { getOutboundVoiceTwiml } from "@/services/voice-agent.service";

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
      businessId,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const triggerReason = request.nextUrl.searchParams.get("triggerReason");
  const callMode = request.nextUrl.searchParams.get("callMode");
  const callSid = params.CallSid?.trim() || null;

  return runVoiceTwimlWebhook(async () => {
    const twiml = await getOutboundVoiceTwiml(
      businessId,
      triggerReason,
      callMode,
      callSid,
    );

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }, {
    route: "outbound",
    businessId,
    callSid,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
