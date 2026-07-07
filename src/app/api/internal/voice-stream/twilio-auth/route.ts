import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { resolveTwilioWebhookValidationContext } from "@/services/twilio-integration.service";

export async function GET(request: NextRequest) {
  if (!verifyVoiceStreamSecret(request.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get("businessId")?.trim();

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const validation = await resolveTwilioWebhookValidationContext(businessId);

  if (!validation?.authToken) {
    return new NextResponse("Twilio Auth Token unavailable", { status: 404 });
  }

  return NextResponse.json(
    {
      authToken: validation.authToken,
      expectedAccountSid: validation.expectedAccountSid,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
