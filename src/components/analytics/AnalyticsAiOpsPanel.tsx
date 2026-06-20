"use client";

import { AnalyticsAgentRunsPanel } from "@/components/analytics/AnalyticsAgentRunsPanel";
import { AnalyticsAgentsRollupPanel } from "@/components/analytics/AnalyticsAgentsRollupPanel";
import { AnalyticsAutomationsOpsPanel } from "@/components/analytics/AnalyticsAutomationsOpsPanel";
import { AnalyticsOperationsPanel } from "@/components/analytics/AnalyticsOperationsPanel";
import { AiCostPanel } from "@/components/analytics/AiCostPanel";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";
import type {
  AgentAnalyticsRollupItem,
  AgentRunListItem,
  AgentRunsMetrics,
  AutomationOpsMetrics,
} from "@/types/analytics.types";

type AnalyticsAiOpsPanelProps = {
  aiPerformance: AnalyticsPageData["aiPerformance"];
  teamAnalytics: AnalyticsPageData["teamAnalytics"];
  responseTime: AnalyticsPageData["responseTime"];
  aiCost: AnalyticsPageData["aiCost"];
  agentsRollup: AgentAnalyticsRollupItem[];
  automationOps: AutomationOpsMetrics;
  agentRuns: AgentRunsMetrics;
  recentAgentRuns: AgentRunListItem[];
};

export function AnalyticsAiOpsPanel({
  aiPerformance,
  teamAnalytics,
  responseTime,
  aiCost,
  agentsRollup,
  automationOps,
  agentRuns,
  recentAgentRuns,
}: AnalyticsAiOpsPanelProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold">
          {ANALYTICS_MESSAGES.aiOpsPanelTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ANALYTICS_MESSAGES.aiOpsPanelDescription}
        </p>
      </div>

      <AnalyticsOperationsPanel
        aiPerformance={aiPerformance}
        teamAnalytics={teamAnalytics}
        responseTime={responseTime}
      />

      <AiCostPanel metrics={aiCost} />

      <AnalyticsAgentsRollupPanel agents={agentsRollup} />

      <AnalyticsAgentRunsPanel
        metrics={agentRuns}
        recentRuns={recentAgentRuns}
      />

      <AnalyticsAutomationsOpsPanel metrics={automationOps} />
    </div>
  );
}
