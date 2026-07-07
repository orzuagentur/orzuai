import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { handleTwilioCustomerLegStatusUpdate } from "@/services/voice-inbox.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId")?.trim() || "";
  const parentCallSid =
    request.nextUrl.searchParams.get("parentCallSid")?.trim() || "";

  if (!businessId || !parentCallSid) {
    return new NextResponse("Missing businessId or parentCallSid", { status: 400 });
  }

  const params = await readTwilioRequestParams(request);
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

  const callSid = params.CallSid?.trim();
  const callStatus = params.CallStatus?.trim();

  if (!callSid || !callStatus) {
    return new NextResponse("Missing call status", { status: 400 });
  }

  await handleTwilioCustomerLegStatusUpdate({
    businessId,
    parentCallSid,
    callSid,
    callStatus,
  });

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
