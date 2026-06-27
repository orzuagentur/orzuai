import { NextResponse } from "next/server";

import { getVoiceClientTokenForCurrentUser } from "@/services/voice-client.service";

export async function GET() {
  const result = await getVoiceClientTokenForCurrentUser(true);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    token: result.token,
    identity: result.identity,
  });
}
