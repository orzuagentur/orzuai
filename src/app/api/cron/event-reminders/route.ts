import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { runDueEventReminders } from "@/services/event-reminder.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "event-reminders", path: "/api/cron/event-reminders" },
    async () => {
      const result = await runDueEventReminders();

      return NextResponse.json({
        success: true,
        processed: result.processed,
        sent: result.sent,
      });
    },
  );
}
