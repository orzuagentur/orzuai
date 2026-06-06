import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { CrmFunnelMetrics } from "@/types/dashboard.types";

type CrmFunnelPanelProps = {
  funnel: CrmFunnelMetrics;
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export function CrmFunnelPanel({ funnel }: CrmFunnelPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.crmFunnelTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.crmFunnelDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {funnel.stages.map((stage) => (
            <li key={stage.stage}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
                <span className="text-muted-foreground">
                  {stage.count} ({stage.percentage}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">
              {ANALYTICS_MESSAGES.newToQualified}:{" "}
            </span>
            {funnel.newToQualifiedRate}%
          </p>
          <p>
            <span className="font-medium">
              {ANALYTICS_MESSAGES.qualifiedToWon}:{" "}
            </span>
            {funnel.qualifiedToWonRate}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
