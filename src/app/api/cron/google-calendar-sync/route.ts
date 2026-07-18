import { NextResponse, type NextRequest } from "next/server";

import {
  reportCronPartialFailures,
  runAuthorizedCron,
} from "@/lib/cron/run-authorized-cron";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGoogleCalendarEventsForBusiness } from "@/services/calendar-events.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "google-calendar-sync", path: "/api/cron/google-calendar-sync" },
    async () => {
      if (!hasSupabaseEnv()) {
        return NextResponse.json(
          { success: false, message: "No DB" },
          { status: 500 },
        );
      }

      const admin = createAdminClient();
      const { data: connections } = await admin
        .from("google_calendar_connections")
        .select("business_id")
        .eq("google_calendar_status", "connected")
        .limit(200);

      const businessIds = [
        ...new Set(
          (connections ?? []).map((row) => row.business_id).filter(Boolean),
        ),
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

      reportCronPartialFailures({
        name: "google-calendar-sync",
        path: "/api/cron/google-calendar-sync",
        failed: errors,
        processed: businessIds.length,
      });

      return NextResponse.json({
        success: true,
        businesses: businessIds.length,
        synced,
        removed,
        errors,
      });
    },
  );
}
