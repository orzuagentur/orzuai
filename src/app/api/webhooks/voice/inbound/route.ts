import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { runVoiceTwimlWebhook } from "@/lib/voice/webhook-handler";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import {
  getInboundVoiceTwiml,
  recordInboundVoiceCall,
} from "@/services/voice-agent.service";

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

  let callLogId: string | null = null;

  return runVoiceTwimlWebhook(async () => {
    try {
      callLogId = await recordInboundVoiceCall({
        businessId,
        phoneNumber: params.From ?? "",
        callSid: params.CallSid ?? "",
      });
    } catch (error) {
      console.error(
        "[voice-webhook] inbound call logging failed",
        JSON.stringify({
          businessId,
          callSid: params.CallSid ?? null,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }

    const twiml = await getInboundVoiceTwiml(
      businessId,
      params.CallSid ?? null,
      callLogId,
    );

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }, {
    route: "inbound",
    businessId,
    callSid: params.CallSid ?? null,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
