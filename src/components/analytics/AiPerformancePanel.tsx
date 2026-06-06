import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AiPerformanceMetrics } from "@/types/dashboard.types";

type AiPerformancePanelProps = {
  metrics: AiPerformanceMetrics;
};

export function AiPerformancePanel({ metrics }: AiPerformancePanelProps) {
  const items = [
    {
      label: ANALYTICS_MESSAGES.aiResolutionRate,
      value: `${metrics.aiResolutionRate}%`,
      description: ANALYTICS_MESSAGES.aiResolutionDescription,
    },
    {
      label: ANALYTICS_MESSAGES.handoffRate,
      value: `${metrics.handoffRate}%`,
      description: ANALYTICS_MESSAGES.handoffDescription,
    },
    {
      label: ANALYTICS_MESSAGES.timeSaved,
      value: `${metrics.estimatedMinutesSaved} min`,
      description: ANALYTICS_MESSAGES.timeSavedDescription,
    },
    {
      label: ANALYTICS_MESSAGES.aiVsHuman,
      value: `${metrics.aiReplies} / ${metrics.humanReplies}`,
      description: ANALYTICS_MESSAGES.aiVsHumanDescription,
    },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.aiPerformanceTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.aiPerformanceDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {item.value}
              </p>
              <p className="text-caption mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
