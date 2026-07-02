import { NextResponse, type NextRequest } from "next/server";

import { verifyVoiceStreamSecret } from "@/lib/voice/stream-config";
import { resolveRuntimeAiKeys } from "@/lib/ai/platform-api-keys";

export async function GET(request: NextRequest) {
  if (!verifyVoiceStreamSecret(request.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const keys = await resolveRuntimeAiKeys();

  return NextResponse.json({
    elevenlabsApiKey: keys.elevenlabsApiKey,
    deepgramApiKey: keys.deepgramApiKey,
    openaiApiKey: keys.openaiApiKey,
    refreshedAt: new Date().toISOString(),
  });
}
