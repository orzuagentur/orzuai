import { NextResponse, type NextRequest } from "next/server";

import { handleVoiceGatherInput } from "@/services/voice-ai.service";

export async function POST(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId");
  const directionParam = request.nextUrl.searchParams.get("direction");
  const triggerReason = request.nextUrl.searchParams.get("triggerReason");

  if (!businessId) {
    return new NextResponse("Missing businessId", { status: 400 });
  }

  const direction = directionParam === "outbound" ? "outbound" : "inbound";
  const formData = await request.formData();
  const speechResult = String(formData.get("SpeechResult") ?? "");
  const callSid = String(formData.get("CallSid") ?? "unknown");
  const callerPhone = String(formData.get("From") ?? formData.get("To") ?? "");

  const twiml = await handleVoiceGatherInput({
    businessId,
    callSid,
    direction,
    speechResult,
    triggerReason,
    callerPhone: callerPhone || null,
  });

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
