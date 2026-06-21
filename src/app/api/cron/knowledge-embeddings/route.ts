import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { reindexMissingKnowledgeEmbeddings } from "@/services/knowledge-embedding.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await reindexMissingKnowledgeEmbeddings({
    admin,
    limit: 100,
  });

  return NextResponse.json({
    success: true,
    ...result,
  });
}
