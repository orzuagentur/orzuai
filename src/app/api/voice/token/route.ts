import { NextResponse } from "next/server";

import { getVoiceClientTokenForCurrentUser } from "@/services/voice-client.service";

export async function GET() {
  const result = await getVoiceClientTokenForCurrentUser(true);
  const headers = { "Cache-Control": "no-store" };

  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: 400, headers },
    );
  }

  return NextResponse.json(
    {
      token: result.token,
      identity: result.identity,
    },
    { headers },
  );
}
