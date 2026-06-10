"use client";

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
import type { RevenueMetrics } from "@/types/dashboard.types";

type RevenueMetricsPanelProps = {
  metrics: RevenueMetrics;
  crmHref?: string | null;
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function RevenueMetricsPanel({
  metrics,
  crmHref,
}: RevenueMetricsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {ANALYTICS_MESSAGES.revenueTitle}
            </CardTitle>
            <CardDescription>
              {ANALYTICS_MESSAGES.revenueDescription}
            </CardDescription>
          </div>
          {crmHref ? (
            <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
              <Link href={crmHref}>
                {ANALYTICS_MESSAGES.viewInCrm}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.pipelineValue}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMoney(metrics.totalPipelineValue)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.wonRevenue}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatMoney(metrics.wonRevenue)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {metrics.openDealsCount} open deals · avg{" "}
          {formatMoney(metrics.avgDealSize)} · qualified pipeline{" "}
          {formatMoney(metrics.qualifiedPipelineValue)}
        </p>
      </CardContent>
    </Card>
  );
}
