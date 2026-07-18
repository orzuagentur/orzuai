import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { runVoiceTwimlWebhook } from "@/lib/voice/webhook-handler";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
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

  const callSid = params.CallSid?.trim() || null;

  return runVoiceTwimlWebhook(async () => {
    const twiml = await buildClientNoAnswerTwiml(businessId, callSid);

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }, {
    route: "client-no-answer",
    businessId,
    callSid,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
