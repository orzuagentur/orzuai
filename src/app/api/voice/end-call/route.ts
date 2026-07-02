import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { endActiveVoiceCall } from "@/services/voice-call-control.service";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing." },
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
    parentCallSid?: string;
    phoneNumber?: string;
  } | null;

  const callLogId = body?.callLogId?.trim();
  const parentCallSid = body?.parentCallSid?.trim();
  const phoneNumber = body?.phoneNumber?.trim();

  if (!callLogId && !parentCallSid && !phoneNumber) {
    return NextResponse.json(
      { success: false, message: "Missing call identifier." },
      { status: 400 },
    );
  }

  const result = await endActiveVoiceCall({
    businessId: business.id,
    callLogId,
    parentCallSid,
    phoneNumber,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
