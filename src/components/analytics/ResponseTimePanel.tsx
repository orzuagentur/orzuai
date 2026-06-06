import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { ResponseTimeMetrics } from "@/types/dashboard.types";

type ResponseTimePanelProps = {
  metrics: ResponseTimeMetrics;
};

export function ResponseTimePanel({ metrics }: ResponseTimePanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.responseTimeTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.responseTimeDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            {ANALYTICS_MESSAGES.avgFirstResponse}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {metrics.avgFirstResponseMinutes !== null
              ? `${metrics.avgFirstResponseMinutes} min`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            {ANALYTICS_MESSAGES.avgResolution}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {metrics.avgResolutionHours !== null
              ? `${metrics.avgResolutionHours} h`
              : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
