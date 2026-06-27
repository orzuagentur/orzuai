import { NextResponse, type NextRequest } from "next/server";

import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import {
  isTwilioWebhookSignatureValid,
  readTwilioRequestParams,
} from "@/lib/twilio/request";
import { handleTwilioConnectDeauthorization } from "@/services/twilio-integration.service";

async function handleDeauthorize(request: NextRequest) {
  const params = await readTwilioRequestParams(request);
  const authToken = getTwilioPlatformAuthToken();

  if (
    !isTwilioWebhookSignatureValid({
      request,
      params,
      authToken,
    })
  ) {
    return new NextResponse("Invalid Twilio signature", { status: 403 });
  }

  const accountSid = params.AccountSid;
  const connectAppSid = params.ConnectAppSid ?? null;

  if (!accountSid) {
    return new NextResponse("Missing AccountSid", { status: 400 });
  }

  const result = await handleTwilioConnectDeauthorization({
    accountSid,
    connectAppSid,
  });

  if (!result.success) {
    return new NextResponse("Deauthorize rejected", { status: 400 });
  }

  return new NextResponse("OK", { status: 200 });
}

export async function GET(request: NextRequest) {
  return handleDeauthorize(request);
}

export async function POST(request: NextRequest) {
  return handleDeauthorize(request);
}
