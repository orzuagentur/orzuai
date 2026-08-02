import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveElevenLabsLanguageCode } from "@/lib/voice/language";
import { hasElevenLabsConfiguredAsync } from "@/lib/ai/platform-api-keys";
import { synthesizeElevenLabsSpeech } from "@/services/elevenlabs.service";

/** Warm, natural default — ElevenLabs “Sarah”. Override with LANDING_ELEVENLABS_VOICE_ID. */
const DEFAULT_LANDING_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MAX_CHARS = 320;

export async function POST(request: Request) {
  if (!(await hasElevenLabsConfiguredAsync())) {
    return NextResponse.json(
      { success: false, message: "ElevenLabs is not configured." },
      { status: 503 },
    );
  }

  // Distributed rate limit (fails open without Upstash) — protects a public,
  // paid TTS endpoint from cost-abuse across all serverless instances.
  const limit = await checkRateLimit({
    key: `landing-tts:${getClientIp(request)}`,
    limit: 24,
    windowSeconds: 60,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.resetSeconds) } },
    );
  }

  let body: { text?: string; locale?: string };
  try {
    body = (await request.json()) as { text?: string; locale?: string };
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }

  const text = String(body.text ?? "").trim().slice(0, MAX_CHARS);
  if (!text) {
    return NextResponse.json({ success: false, message: "Text is empty." }, { status: 400 });
  }

  const locale = body.locale === "ru" || body.locale === "uz" ? body.locale : "en";
  const voiceId =
    process.env.LANDING_ELEVENLABS_VOICE_ID?.trim() || DEFAULT_LANDING_VOICE_ID;

  const speech = await synthesizeElevenLabsSpeech({
    text,
    voiceId,
    languageCode: resolveElevenLabsLanguageCode(locale),
    modelId: "eleven_flash_v2_5",
  });

  if (!speech.success) {
    return NextResponse.json(
      { success: false, message: speech.message },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(speech.buffer), {
    status: 200,
    headers: {
      "Content-Type": speech.mimeType,
      "Cache-Control": "no-store",
    },
  });
}
