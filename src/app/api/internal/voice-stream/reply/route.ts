import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { generateVoiceStreamReply } from "@/services/voice-stream.service";

export async function POST(request: NextRequest) {
  if (!verifyVoiceStreamSecret(request.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    businessId?: string;
    callSid?: string;
    direction?: string;
    userMessage?: string;
    triggerReason?: string | null;
  };

  const businessId = body.businessId?.trim();
  const callSid = body.callSid?.trim();
  const userMessage = body.userMessage?.trim();

  if (!businessId || !callSid || !userMessage) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const direction = body.direction === "outbound" ? "outbound" : "inbound";

  try {
    const reply = await generateVoiceStreamReply({
      businessId,
      callSid,
      direction,
      userMessage,
      triggerReason: body.triggerReason ?? null,
    });

    return NextResponse.json(reply);
  } catch (error) {
    return NextResponse.json(
      {
        text: "Sorry, something went wrong.",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}
