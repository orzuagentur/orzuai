import { NextResponse, type NextRequest } from "next/server";

import { getOutboundVoiceTwiml } from "@/services/voice-agent.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const triggerReason = request.nextUrl.searchParams.get("triggerReason");
  const twiml = await getOutboundVoiceTwiml(businessId, triggerReason);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
