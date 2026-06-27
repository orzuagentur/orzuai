import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";

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

  const connection = await getTwilioConnection(business.id);
  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials?.accountSid || !credentials.authToken) {
    return new NextResponse("Twilio credentials missing", { status: 503 });
  }

  const recordingUrl = `${callLog.recording_url}.mp3`;
  const authHeader = `Basic ${Buffer.from(
    `${credentials.accountSid}:${credentials.authToken}`,
  ).toString("base64")}`;

  const upstream = await fetch(recordingUrl, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new NextResponse("Unable to fetch recording", {
      status: upstream.status,
    });
  }

  const bytes = await upstream.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
