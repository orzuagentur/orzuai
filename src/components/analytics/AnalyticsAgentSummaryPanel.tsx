import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AgentDashboardStats } from "@/types/agent-dashboard.types";

type AnalyticsAgentSummaryPanelProps = {
  stats: AgentDashboardStats;
};

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "—";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function AnalyticsAgentSummaryPanel({
  stats,
}: AnalyticsAgentSummaryPanelProps) {
  const items = [
    {
      label: ANALYTICS_MESSAGES.aiAgentTextReplies,
      value: String(stats.aiTextReplies),
    },
    {
      label: ANALYTICS_MESSAGES.aiAgentVoiceReplies,
      value: String(stats.voiceAiReplies),
    },
    {
      label: ANALYTICS_MESSAGES.aiAgentContactsServed,
      value: String(stats.contactsServed),
    },
    {
      label: ANALYTICS_MESSAGES.aiAgentCallTime,
      value: formatMinutes(stats.totalCallMinutes),
    },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.aiAgentSummaryTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.aiAgentSummaryDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
