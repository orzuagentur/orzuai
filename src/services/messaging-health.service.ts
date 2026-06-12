import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MessagingHealthSnapshot = {
  pendingDeliveries: number;
  failedDeliveries: number;
  deadLetterDeliveries: number;
  pendingWebhooks: number;
  failedWebhooks: number;
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
  ]);

  return {
    pendingDeliveries: pendingDeliveries.count ?? 0,
    failedDeliveries: failedDeliveries.count ?? 0,
    deadLetterDeliveries: deadLetterDeliveries.count ?? 0,
    pendingWebhooks: pendingWebhooks.count ?? 0,
    failedWebhooks: failedWebhooks.count ?? 0,
    capturedAt: now,
  };
}
