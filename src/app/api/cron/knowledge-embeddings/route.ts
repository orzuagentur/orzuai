import { NextResponse, type NextRequest } from "next/server";

import {
  reportCronPartialFailures,
  runAuthorizedCron,
} from "@/lib/cron/run-authorized-cron";
import { reindexMissingKnowledgeEmbeddings } from "@/services/knowledge-embedding.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "knowledge-embeddings", path: "/api/cron/knowledge-embeddings" },
    async () => {
      const admin = createAdminClient();
      const result = await reindexMissingKnowledgeEmbeddings({
        admin,
        limit: 100,
      });
      reportCronPartialFailures({
        name: "knowledge-embeddings",
        path: "/api/cron/knowledge-embeddings",
        failed: result.failed ?? 0,
        processed: result.indexed,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    },
  );
}
