import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { syncAllGmailInboxes } from "@/services/gmail-integration.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "gmail-sync", path: "/api/cron/gmail-sync" },
    async () => {
      const result = await syncAllGmailInboxes();

      return NextResponse.json({
        success: true,
        processed: result.processed,
        imported: result.imported,
      });
    },
  );
}
