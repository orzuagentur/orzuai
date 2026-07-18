import { NextResponse, type NextRequest } from "next/server";

import {
  reportCronPartialFailures,
  runAuthorizedCron,
} from "@/lib/cron/run-authorized-cron";
import { runDueWebsiteKnowledgeSyncs } from "@/services/website-knowledge.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "sync-website-knowledge", path: "/api/cron/sync-website-knowledge" },
    async () => {
      const result = await runDueWebsiteKnowledgeSyncs();
      const failed = Math.max(
        0,
        (result.processed ?? 0) - (result.succeeded ?? 0),
      );
      reportCronPartialFailures({
        name: "sync-website-knowledge",
        path: "/api/cron/sync-website-knowledge",
        failed,
        processed: result.processed,
      });

      return NextResponse.json({
        success: true,
        processed: result.processed,
        succeeded: result.succeeded,
      });
    },
  );
}
