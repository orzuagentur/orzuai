import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { drainPendingMessageDeliveries } from "@/services/message-delivery.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "message-deliveries", path: "/api/cron/message-deliveries" },
    async () => {
      const result = await drainPendingMessageDeliveries();

      return NextResponse.json({
        success: true,
        ...result,
      });
    },
  );
}
