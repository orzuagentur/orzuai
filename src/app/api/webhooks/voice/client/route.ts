import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { runVoiceTwimlWebhook } from "@/lib/voice/webhook-handler";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { buildClientOutboundTwiml } from "@/services/voice-client.service";

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

  const toNumber =
    params.To?.trim() ||
    params.to?.trim() ||
    params.phoneNumber?.trim() ||
    "";
  const callSid = params.CallSid?.trim() || null;

  return runVoiceTwimlWebhook(async () => {
    const twiml = await buildClientOutboundTwiml({
      businessId,
      toNumber,
      callSid,
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }, {
    route: "client",
    businessId,
    callSid,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
