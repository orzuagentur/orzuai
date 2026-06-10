import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { CrmFunnelMetrics } from "@/types/dashboard.types";
import type { PipelineStage } from "@/types/contact.types";

type CrmFunnelPanelProps = {
  funnel: CrmFunnelMetrics;
  stageHref?: (stage: string, count: number) => string | null;
  stageLinkLabel?: (count: number) => string;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function CrmFunnelPanel({
  funnel,
  stageHref,
  stageLinkLabel,
}: CrmFunnelPanelProps) {
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
          {funnel.stages.map((stage) => {
            const href = stageHref?.(stage.stage, stage.count);
            const label =
              STAGE_LABELS[stage.stage as PipelineStage] ?? stage.stage;

            return (
              <li key={stage.stage}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span>{label}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {stage.count} ({stage.percentage}%)
                    {href ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2"
                        asChild
                      >
                        <Link href={href}>
                          {stageLinkLabel?.(stage.count) ??
                            ANALYTICS_MESSAGES.viewInCrm}
                          <ArrowRightIcon className="size-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </li>
            );
          })}
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
