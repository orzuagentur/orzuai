import { NextResponse } from "next/server";

import { buildStaticSayTwiml } from "@/lib/voice/twiml";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";

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

    schedulePlatformErrorReport({
      severity: "critical",
      module: "voice",
      category: "webhook",
      source: "voice-webhook",
      title: "Voice TwiML webhook failed",
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      businessId: context?.businessId ?? null,
      path: context?.route ?? null,
      method: "POST",
      context: {
        callSid: context?.callSid ?? null,
      },
      rootCause: "Unhandled exception while building Twilio voice TwiML.",
      suggestedFix: "Inspect voice webhook route logs and recent Twilio payload changes.",
    });

    return new NextResponse(buildVoiceWebhookErrorTwiml(), {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }
}
