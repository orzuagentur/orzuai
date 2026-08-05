import type { AiHealthSnapshot } from "@/services/ai-health.service";

const LAG_ALERT_SECONDS = 300;
const FAILED_RUNS_ALERT = 10;

export type AiOpsAlertResult = {
  triggered: boolean;
  reasons: string[];
};

export async function evaluateAiOpsAlerts(
  health: AiHealthSnapshot,
): Promise<AiOpsAlertResult> {
  const reasons: string[] = [];

  if (health.replyQueue.lagSeconds > LAG_ALERT_SECONDS) {
    reasons.push(`reply_queue_lag_${health.replyQueue.lagSeconds}s`);
  }

  if (health.orchestrationQueue.lagSeconds > LAG_ALERT_SECONDS) {
    reasons.push(
      `orchestration_queue_lag_${health.orchestrationQueue.lagSeconds}s`,
    );
  }

  if (health.failedOrchestratorRuns24h >= FAILED_RUNS_ALERT) {
    reasons.push(`failed_orchestrator_runs_${health.failedOrchestratorRuns24h}`);
  }

  if (reasons.length > 0) {
    console.warn(
      "[ai-ops-alert]",
      JSON.stringify({
        reasons,
        capturedAt: health.capturedAt,
        replyPending: health.replyQueue.pendingCount,
        orchestrationPending: health.orchestrationQueue.pendingCount,
      }),
    );
  }

  return { triggered: reasons.length > 0, reasons };
}
