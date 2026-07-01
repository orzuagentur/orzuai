import { NextResponse } from "next/server";

import { buildStaticSayTwiml } from "@/lib/voice/twiml";

const DEFAULT_ERROR_MESSAGE =
  "We are experiencing technical difficulties. Please try again later.";

export function buildVoiceWebhookErrorTwiml(
  message = DEFAULT_ERROR_MESSAGE,
): string {
  return buildStaticSayTwiml({
    speech: message,
    speechLocale: "en-US",
  });
}

export async function runVoiceTwimlWebhook(
  handler: () => Promise<NextResponse>,
  context?: { route?: string; businessId?: string | null; callSid?: string | null },
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    console.error(
      "[voice-webhook] handler failed",
      JSON.stringify({
        route: context?.route ?? "unknown",
        businessId: context?.businessId ?? null,
        callSid: context?.callSid ?? null,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return new NextResponse(buildVoiceWebhookErrorTwiml(), {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}
