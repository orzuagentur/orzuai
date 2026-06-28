import { NextResponse } from "next/server";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { syncGoogleCalendarEventsForBusiness } from "@/services/calendar-events.service";
import { isGoogleCalendarConnected } from "@/services/google-calendar.service";

export async function POST() {
  try {
    const user = await requireUser();
    const business = await getPrimaryBusiness(user.id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found." },
        { status: 400 },
      );
    }

    const connected = await isGoogleCalendarConnected(business.id);

    if (!connected) {
      return NextResponse.json(
        { success: false, message: ORZUX_CALENDAR_MESSAGES.connectGoogleShort },
        { status: 400 },
      );
    }

    const result = await syncGoogleCalendarEventsForBusiness(business.id, {
      revalidate: true,
    });

    if (result.syncError) {
      return NextResponse.json(
        { success: false, message: result.syncError, synced: result.synced },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: ORZUX_CALENDAR_MESSAGES.googleSyncFailed },
      { status: 500 },
    );
  }
}
