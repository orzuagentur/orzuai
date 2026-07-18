import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { handleVoiceStreamLifecycle } from "@/services/voice-stream.service";

export async function POST(request: NextRequest) {
  if (!verifyVoiceStreamSecret(request.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    businessId?: string;
    callSid?: string;
    callLogId?: string | null;
    direction?: string;
    event?: string;
    triggerReason?: string | null;
  };

  const businessId = body.businessId?.trim();
  const callSid = body.callSid?.trim();
  const event = body.event === "stop" ? "stop" : body.event === "start" ? "start" : null;

  if (!businessId || !callSid || !event) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const direction = body.direction === "outbound" ? "outbound" : "inbound";

  await handleVoiceStreamLifecycle({
    businessId,
    callSid,
    callLogId: body.callLogId ?? null,
    direction,
    event,
    triggerReason: body.triggerReason ?? null,
  });

  return NextResponse.json({ ok: true });
}
