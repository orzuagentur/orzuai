import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { drainInboundWebhookQueue } from "@/services/webhook-queue.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "webhook-queue", path: "/api/cron/webhook-queue" },
    async () => {
      const result = await drainInboundWebhookQueue();

      return NextResponse.json({
        success: true,
        fallback: true,
        ...result,
      });
    },
  );
}
