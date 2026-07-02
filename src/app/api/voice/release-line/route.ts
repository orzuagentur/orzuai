import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { releaseOperatorVoiceLine } from "@/services/voice-outbound-cancel.service";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing.", released: 0 },
      { status: 503 },
    );
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business not found.", released: 0 },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    phoneNumber?: string;
  } | null;

  const result = await releaseOperatorVoiceLine({
    businessId: business.id,
    phoneNumber: body?.phoneNumber?.trim() || undefined,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
