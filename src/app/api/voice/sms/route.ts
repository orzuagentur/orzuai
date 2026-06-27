import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { sendVoiceChannelSms } from "@/services/voice-sms.service";

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
    phoneNumber?: string;
    message?: string;
  } | null;

  const phoneNumber = body?.phoneNumber?.trim();
  const message = body?.message?.trim();

  if (!phoneNumber || !message) {
    return NextResponse.json(
      { success: false, message: "Phone number and message are required." },
      { status: 400 },
    );
  }

  const result = await sendVoiceChannelSms({
    businessId: business.id,
    phoneNumber,
    body: message,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
