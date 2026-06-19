import { NextResponse } from "next/server";

import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { sendTestPushNotification } from "@/services/push-notifications.service";
import { hasPushEnv } from "@/lib/env";

export async function POST() {
  if (!hasPushEnv()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on the server." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 400 });
  }

  const result = await sendTestPushNotification(business.id);

  if (result.skipped) {
    return NextResponse.json(
      {
        success: false,
        message:
          "No active push subscriptions found. Enable notifications on this device first.",
        ...result,
      },
      { status: 400 },
    );
  }

  if (result.sent === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to deliver the test notification.",
        ...result,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `Test notification sent to ${result.sent} device(s).`,
    ...result,
  });
}
