import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { drainInboundMediaHydrationQueue } from "@/services/inbound-media-hydration.service";
import { logMessagingQueueLagAlerts } from "@/lib/observability/messaging-metrics";
import { getMessagingHealthSnapshot } from "@/services/messaging-health.service";
import { drainPendingMessageDeliveries } from "@/services/message-delivery.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "messaging-health", path: "/api/cron/messaging-health" },
    async () => {
      const [deliveries, mediaHydration, health] = await Promise.all([
        drainPendingMessageDeliveries(),
        drainInboundMediaHydrationQueue(),
        getMessagingHealthSnapshot(),
      ]);

      const queueLagAlerts = logMessagingQueueLagAlerts(health);

      return NextResponse.json({
        success: true,
        deliveries,
        mediaHydration,
        health,
        queueLagAlerts,
      });
    },
  );
}
