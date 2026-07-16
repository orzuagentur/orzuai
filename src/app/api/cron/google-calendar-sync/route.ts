import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGoogleCalendarEventsForBusiness } from "@/services/calendar-events.service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ success: false, message: "No DB" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("google_calendar_connections")
    .select("business_id")
    .eq("google_calendar_status", "connected")
    .limit(200);

  const businessIds = [
    ...new Set((connections ?? []).map((row) => row.business_id).filter(Boolean)),
  ];

  let synced = 0;
  let removed = 0;
  let errors = 0;

  for (const businessId of businessIds) {
    try {
      const result = await syncGoogleCalendarEventsForBusiness(businessId);
      synced += result.synced;
      removed += result.removed;
      if (result.syncError) {
        errors += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({
    success: true,
    businesses: businessIds.length,
    synced,
    removed,
    errors,
  });
}
