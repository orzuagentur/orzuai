import { NextResponse, type NextRequest } from "next/server";

import { getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import { validateTwilioRequestSignature } from "@/lib/twilio/validate-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioConnection, resolveTwilioCredentialsForBusiness } from "@/services/twilio-integration.service";
import { getInboundVoiceTwiml } from "@/services/voice-agent.service";

async function readTwilioFormParams(
  request: NextRequest,
): Promise<Record<string, string>> {
  const formData = await request.formData();
  const params: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  return params;
}

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const params =
    request.method === "POST"
      ? await readTwilioFormParams(request)
      : Object.fromEntries(request.nextUrl.searchParams.entries());

  const connection = await getTwilioConnection(businessId);
  const credentials = resolveTwilioCredentialsForBusiness(connection);
  const authToken =
    credentials?.authToken ?? getTwilioPlatformAuthToken() ?? null;
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

  const admin = createAdminClient();
  const from = params.From ?? "";
  const callSid = params.CallSid ?? "";

  await admin.from("voice_call_logs").insert({
    business_id: businessId,
    direction: "inbound",
    phone_number: from || "unknown",
    status: "answered",
    provider: "twilio",
    external_call_id: callSid || null,
    trigger_reason: "inbound_call",
  });

  const twiml = await getInboundVoiceTwiml(businessId);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
