import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getInboundVoiceTwiml } from "@/services/voice-agent.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const admin = createAdminClient();
  const formData = await request.formData();
  const from = String(formData.get("From") ?? "");
  const callSid = String(formData.get("CallSid") ?? "");

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
