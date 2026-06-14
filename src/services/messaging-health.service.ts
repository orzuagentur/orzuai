import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getInboundMediaHydrationLagMetrics } from "@/services/inbound-media-hydration.service";
import { getWebhookQueueLagMetrics } from "@/services/webhook-queue.service";

export type MessagingHealthSnapshot = {
  pendingDeliveries: number;
  failedDeliveries: number;
  deadLetterDeliveries: number;
  pendingWebhooks: number;
  failedWebhooks: number;
  webhookQueueLagSeconds: number;
  oldestPendingWebhookAt: string | null;
  staleProcessingWebhooks: number;
  pendingHydration: number;
  failedHydration: number;
  hydrationLagSeconds: number;
  oldestPendingHydrationAt: string | null;
  staleProcessingHydration: number;
  capturedAt: string;
};

export async function getMessagingHealthSnapshot(): Promise<MessagingHealthSnapshot> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [
    pendingDeliveries,
    failedDeliveries,
    deadLetterDeliveries,
    pendingWebhooks,
    failedWebhooks,
    webhookQueueLag,
    hydrationLag,
  ] = await Promise.all([
    admin
      .from("message_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("message_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("message_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .not("failed_at", "is", null),
    admin
      .from("inbound_webhook_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("inbound_webhook_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    getWebhookQueueLagMetrics(),
    getInboundMediaHydrationLagMetrics(),
  ]);

  return {
    pendingDeliveries: pendingDeliveries.count ?? 0,
    failedDeliveries: failedDeliveries.count ?? 0,
    deadLetterDeliveries: deadLetterDeliveries.count ?? 0,
    pendingWebhooks: pendingWebhooks.count ?? 0,
    failedWebhooks: failedWebhooks.count ?? 0,
    webhookQueueLagSeconds: webhookQueueLag.lagSeconds,
    oldestPendingWebhookAt: webhookQueueLag.oldestPendingAt,
    staleProcessingWebhooks: webhookQueueLag.staleProcessingCount,
    pendingHydration: hydrationLag.pendingCount,
    failedHydration: hydrationLag.failedCount,
    hydrationLagSeconds: hydrationLag.lagSeconds,
    oldestPendingHydrationAt: hydrationLag.oldestPendingAt,
    staleProcessingHydration: hydrationLag.staleProcessingCount,
    capturedAt: now,
  };
}
