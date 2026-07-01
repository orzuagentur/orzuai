import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { appendVoiceStreamSessionTurn } from "@/services/voice-stream.service";

export async function POST(request: NextRequest) {
  if (!verifyVoiceStreamSecret(request.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    businessId?: string;
    callSid?: string;
    direction?: string;
    role?: string;
    content?: string;
  };

  const businessId = body.businessId?.trim();
  const callSid = body.callSid?.trim();
  const content = body.content?.trim();
  const role = body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null;

  if (!businessId || !callSid || !content || !role) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const direction = body.direction === "outbound" ? "outbound" : "inbound";

  await appendVoiceStreamSessionTurn({
    businessId,
    callSid,
    direction,
    role,
    content,
  });

  return NextResponse.json({ ok: true });
}
