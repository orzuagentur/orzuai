import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { expireDueTrials } from "@/services/trial.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "expire-trials", path: "/api/cron/expire-trials" },
    async () => {
      const result = await expireDueTrials();

      return NextResponse.json({
        success: true,
        expired: result.expired,
        emailed: result.emailed,
      });
    },
  );
}
