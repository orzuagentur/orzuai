import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { drainInboundMediaHydrationQueue } from "@/services/inbound-media-hydration.service";
import { logMessagingQueueLagAlerts } from "@/lib/observability/messaging-metrics";
import { getMessagingHealthSnapshot } from "@/services/messaging-health.service";
import { drainPendingMessageDeliveries } from "@/services/message-delivery.service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
