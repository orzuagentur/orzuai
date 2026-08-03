import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { syncAllOutlookInboxes } from "@/services/outlook-integration.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "outlook-sync", path: "/api/cron/outlook-sync" },
    async () => {
      const result = await syncAllOutlookInboxes();

      return NextResponse.json({
        success: true,
        processed: result.processed,
        imported: result.imported,
      });
    },
  );
}
