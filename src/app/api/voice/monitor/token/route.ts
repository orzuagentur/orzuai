import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import {
  getVoiceMonitorWsUrl,
  signMonitorToken,
} from "@/lib/voice/stream-config";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing." },
      { status: 503 },
    );
  }

  const monitorWsUrl = getVoiceMonitorWsUrl();
  if (!monitorWsUrl) {
    return NextResponse.json(
      { success: false, message: "Voice monitor is not configured." },
      { status: 503 },
    );
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business not found." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    callLogId?: string;
  } | null;

  const callLogId = body?.callLogId?.trim();
  if (!callLogId) {
    return NextResponse.json(
      { success: false, message: "Missing callLogId." },
      { status: 400 },
    );
  }

  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogById(business.id, callLogId);

  if (!callLog) {
    return NextResponse.json(
      { success: false, message: "Call not found." },
      { status: 404 },
    );
  }

  if (!isActiveVoiceCallStatus(callLog.status)) {
    return NextResponse.json(
      { success: false, message: "Call is no longer active." },
      { status: 400 },
    );
  }

  const callSid = callLog.external_call_id?.trim();
  if (!callSid) {
    return NextResponse.json(
      { success: false, message: "Call session is not ready for monitoring." },
      { status: 400 },
    );
  }

  const token = signMonitorToken({
    businessId: business.id,
    callSid,
    callLogId,
  });

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Voice monitor signing is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    monitorWsUrl,
    token,
    expiresInSeconds: 300,
  });
}
