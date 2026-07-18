import { NextResponse, type NextRequest } from "next/server";

import {
  reportCronPartialFailures,
  runAuthorizedCron,
} from "@/lib/cron/run-authorized-cron";
import { renewAllGmailWatches } from "@/services/gmail-integration.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "gmail-watch-renew", path: "/api/cron/gmail-watch-renew" },
    async () => {
      const result = await renewAllGmailWatches();
      reportCronPartialFailures({
        name: "gmail-watch-renew",
        path: "/api/cron/gmail-watch-renew",
        failed: result.failed,
        processed: result.processed,
      });

      return NextResponse.json({
        success: true,
        processed: result.processed,
        renewed: result.renewed,
        failed: result.failed,
      });
    },
  );
}
