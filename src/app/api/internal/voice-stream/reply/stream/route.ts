import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { generateVoiceStreamReplyStream } from "@/services/voice-stream.service";

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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generateVoiceStreamReplyStream({
          businessId,
          callSid,
          direction,
          userMessage,
          triggerReason: body.triggerReason ?? null,
        })) {
          controller.enqueue(
            encoder.encode(`${JSON.stringify(chunk)}\n`),
          );
        }
      } catch (error) {
        const fallback = {
          type: "done" as const,
          text: "Sorry, something went wrong.",
          error: error instanceof Error ? error.message : "unknown",
          endCall: false,
        };
        controller.enqueue(encoder.encode(`${JSON.stringify(fallback)}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
