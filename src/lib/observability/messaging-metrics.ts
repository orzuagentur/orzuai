import "server-only";

import type { MessagingHealthSnapshot } from "@/services/messaging-health.service";

const DELIVERY_PENDING_WARN = 50;
const WEBHOOK_LAG_WARN_SECONDS = 120;
const HYDRATION_LAG_WARN_SECONDS = 300;

export type MessagingQueueLagAlert = {
  kind: "delivery_backlog" | "webhook_lag" | "hydration_lag";
  level: "warn" | "error";
  message: string;
  metrics: Record<string, number | string | null>;
};

function logStructured(
  level: "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    event,
    ts: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.warn(line);
}

export function collectMessagingQueueLagAlerts(
  health: MessagingHealthSnapshot,
): MessagingQueueLagAlert[] {
  const alerts: MessagingQueueLagAlert[] = [];

  if (health.pendingDeliveries >= DELIVERY_PENDING_WARN) {
    alerts.push({
      kind: "delivery_backlog",
      level: health.pendingDeliveries >= DELIVERY_PENDING_WARN * 4 ? "error" : "warn",
      message: "Outbound delivery queue backlog is elevated",
      metrics: {
        pendingDeliveries: health.pendingDeliveries,
        failedDeliveries: health.failedDeliveries,
        deadLetterDeliveries: health.deadLetterDeliveries,
      },
    });
  }

  if (health.webhookQueueLagSeconds >= WEBHOOK_LAG_WARN_SECONDS) {
    alerts.push({
      kind: "webhook_lag",
      level:
        health.webhookQueueLagSeconds >= WEBHOOK_LAG_WARN_SECONDS * 2
          ? "error"
          : "warn",
      message: "Inbound webhook queue lag is elevated",
      metrics: {
        pendingWebhooks: health.pendingWebhooks,
        failedWebhooks: health.failedWebhooks,
        webhookQueueLagSeconds: health.webhookQueueLagSeconds,
        oldestPendingWebhookAt: health.oldestPendingWebhookAt,
        staleProcessingWebhooks: health.staleProcessingWebhooks,
      },
    });
  }

  if (health.hydrationLagSeconds >= HYDRATION_LAG_WARN_SECONDS) {
    alerts.push({
      kind: "hydration_lag",
      level:
        health.hydrationLagSeconds >= HYDRATION_LAG_WARN_SECONDS * 2
          ? "error"
          : "warn",
      message: "Inbound media hydration lag is elevated",
      metrics: {
        pendingHydration: health.pendingHydration,
        failedHydration: health.failedHydration,
        hydrationLagSeconds: health.hydrationLagSeconds,
        oldestPendingHydrationAt: health.oldestPendingHydrationAt,
        staleProcessingHydration: health.staleProcessingHydration,
      },
    });
  }

  return alerts;
}

export function logMessagingQueueLagAlerts(
  health: MessagingHealthSnapshot,
): MessagingQueueLagAlert[] {
  const alerts = collectMessagingQueueLagAlerts(health);

  for (const alert of alerts) {
    logStructured(alert.level, "messaging.queue_lag", {
      kind: alert.kind,
      message: alert.message,
      metrics: alert.metrics,
      capturedAt: health.capturedAt,
    });
  }

  return alerts;
}
