import { NextResponse } from "next/server";

import { hasElevenLabsEnv, hasSupabaseEnv } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listElevenLabsVoices } from "@/services/elevenlabs.service";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing.", voices: [] },
      { status: 503 },
    );
  }

  if (!hasElevenLabsEnv()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message: "ElevenLabs API is not configured on the server.",
        voices: [],
      },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business not found.", voices: [] },
      { status: 400 },
    );
  }

  const result = await listElevenLabsVoices();

  return NextResponse.json({
    success: result.success,
    configured: true,
    message: result.message,
    voices: result.voices,
  });
}
