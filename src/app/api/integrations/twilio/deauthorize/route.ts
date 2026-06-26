import { NextResponse, type NextRequest } from "next/server";

import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import { validateTwilioRequestSignature } from "@/lib/twilio/validate-request";
import { handleTwilioConnectDeauthorization } from "@/services/twilio-integration.service";

async function readTwilioParams(
  request: NextRequest,
): Promise<Record<string, string>> {
  if (request.method === "GET") {
    return Object.fromEntries(request.nextUrl.searchParams.entries());
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  return params;
}

async function handleDeauthorize(request: NextRequest) {
  const params = await readTwilioParams(request);
  const authToken = getTwilioPlatformAuthToken();
  const signature = request.headers.get("x-twilio-signature");

  if (authToken && signature) {
    const isValid = validateTwilioRequestSignature({
      authToken,
      signature,
      url: request.url,
      params,
    });

    if (!isValid) {
      return new NextResponse("Invalid Twilio signature", { status: 403 });
    }
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
