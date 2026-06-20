import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type {
  AiPerformanceMetrics,
  ResponseTimeMetrics,
  TeamAnalyticsMetrics,
} from "@/types/dashboard.types";

type AnalyticsOperationsPanelProps = {
  aiPerformance: AiPerformanceMetrics;
  teamAnalytics: TeamAnalyticsMetrics;
  responseTime: ResponseTimeMetrics;
};

export function AnalyticsOperationsPanel({
  aiPerformance,
  teamAnalytics,
  responseTime,
}: AnalyticsOperationsPanelProps) {
  const items = [
    {
      label: ANALYTICS_MESSAGES.aiAssistantOnlyReplies,
      value: String(aiPerformance.assistantOnlyReplies),
      hint: ANALYTICS_MESSAGES.aiAssistantOnlyDescription,
    },
    {
      label: ANALYTICS_MESSAGES.aiDelegatedReplies,
      value: `${aiPerformance.delegatedAgentReplies} (${aiPerformance.delegatedSharePercent}%)`,
      hint: ANALYTICS_MESSAGES.aiDelegatedDescription,
    },
    {
      label: ANALYTICS_MESSAGES.aiResolutionRate,
      value: `${aiPerformance.aiResolutionRate}%`,
      hint: ANALYTICS_MESSAGES.aiResolutionDescription,
    },
    {
      label: ANALYTICS_MESSAGES.aiVsHuman,
      value: `${aiPerformance.aiReplies} / ${aiPerformance.humanReplies}`,
      hint: ANALYTICS_MESSAGES.aiVsHumanDescription,
    },
    {
      label: ANALYTICS_MESSAGES.slaCompliance,
      value: `${teamAnalytics.slaCompliancePercent}%`,
      hint: `Target ${teamAnalytics.slaTargetMinutes} min first response`,
    },
    {
      label: ANALYTICS_MESSAGES.avgFirstResponse,
      value:
        responseTime.avgFirstResponseMinutes != null
          ? `${responseTime.avgFirstResponseMinutes} min`
          : "—",
      hint: ANALYTICS_MESSAGES.responseTimeDescription,
    },
    {
      label: ANALYTICS_MESSAGES.avgResolution,
      value:
        responseTime.avgResolutionHours != null
          ? `${responseTime.avgResolutionHours} h`
          : "—",
      hint: "Across recently resolved conversations",
    },
    {
      label: ANALYTICS_MESSAGES.timeSaved,
      value: `${aiPerformance.estimatedMinutesSaved} min`,
      hint: ANALYTICS_MESSAGES.timeSavedDescription,
    },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.aiOpsOperationsTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.aiOpsOperationsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {item.value}
              </p>
              <p className="text-caption mt-1">{item.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {teamAnalytics.teamReplies} team replies · {teamAnalytics.clientMessages}{" "}
          customer messages · {teamAnalytics.aiReplies} AI replies sampled across{" "}
          {teamAnalytics.sampledConversations} conversations for SLA
        </p>
      </CardContent>
    </Card>
  );
}
