import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { downloadTwilioRecordingAudio } from "@/services/voice-recording.service";

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return new NextResponse("Not configured", { status: 503 });
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const callLogId = request.nextUrl.searchParams.get("callLogId")?.trim();

  if (!callLogId) {
    return new NextResponse("Missing callLogId", { status: 400 });
  }

  const callLog = await getVoiceRepository().findCallLogById(
    business.id,
    callLogId,
  );

  if (!callLog?.recording_url) {
    return new NextResponse("Recording not found", { status: 404 });
  }

  const recording = await downloadTwilioRecordingAudio({
    businessId: business.id,
    recordingUrl: callLog.recording_url,
  });

  if (!recording.success) {
    return new NextResponse(recording.message, { status: 503 });
  }

  return new NextResponse(new Uint8Array(recording.buffer), {
    status: 200,
    headers: {
      "Content-Type": recording.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
