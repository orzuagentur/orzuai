import { NextResponse, type NextRequest } from "next/server";

import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";
import { handleTwilioConferenceEvent } from "@/services/voice-inbox.service";

export async function POST(request: NextRequest) {
  const params = await readTwilioRequestParams(request);
  const businessId =
    request.nextUrl.searchParams.get("businessId")?.trim() ||
    params.businessId?.trim() ||
    "";
  const parentCallSid =
    request.nextUrl.searchParams.get("parentCallSid")?.trim() ||
    params.ParentCallSid?.trim() ||
    "";

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  if (!parentCallSid) {
    return new NextResponse("Missing parentCallSid", { status: 400 });
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
      allowedAccountSids: validation.allowedAccountSids,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  await handleTwilioConferenceEvent({
    businessId,
    parentCallSid,
    participantCallSid: params.CallSid?.trim() || null,
    conferenceSid: params.ConferenceSid?.trim() || null,
    conferenceName:
      params.FriendlyName?.trim() || params.ConferenceName?.trim() || null,
    eventName: params.StatusCallbackEvent?.trim() || params.EventType?.trim() || null,
    participantLabel: params.ParticipantLabel?.trim() || null,
    muted: params.Muted?.trim() || null,
    hold: params.Hold?.trim() || null,
    rawPayload: params,
  });

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
