import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";

export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  return Boolean(cronSecret && provided === cronSecret);
}

export async function runAuthorizedCron(
  request: NextRequest,
  meta: { name: string; path: string },
  work: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await work();
  } catch (error) {
    console.error(`[cron/${meta.name}]`, error);
    schedulePlatformErrorReport({
      severity: "high",
      module: "cron",
      category: "scheduled",
      source: `cron/${meta.name}`,
      title: `Cron ${meta.name} failed`,
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      path: meta.path,
      method: "GET",
      httpStatus: 500,
      rootCause: `Scheduled job ${meta.name} threw an unhandled exception.`,
      suggestedFix: "Check cron logs and recent deploys for this route.",
    });

    return NextResponse.json(
      { error: `Cron ${meta.name} failed` },
      { status: 500 },
    );
  }
}

export function reportCronPartialFailures(input: {
  name: string;
  path: string;
  failed: number;
  processed?: number;
  detail?: string;
}): void {
  if (input.failed <= 0) {
    return;
  }

  schedulePlatformErrorReport({
    severity: input.failed > 5 ? "high" : "warning",
    module: "cron",
    category: "scheduled",
    source: `cron/${input.name}`,
    title: `Cron ${input.name} partial failures`,
    message: input.detail ?? `${input.failed} item(s) failed`,
    path: input.path,
    method: "GET",
    context: {
      failed: input.failed,
      processed: input.processed ?? null,
    },
  });
}
