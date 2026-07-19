"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clock3Icon, Layers2Icon, Loader2Icon } from "lucide-react";

import { HoverIconMenu } from "@/components/dashboard/HoverIconMenu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DASHBOARD_CARD_PERIOD_OPTIONS,
  type DashboardCardVariantConfig,
} from "@/features/dashboard/metric-cards";
import { cn } from "@/lib/utils";
import type { DashboardCardPeriod } from "@/types/dashboard-home.types";
import { formatMetricValue } from "@/utils/dashboard";

type InteractiveAnalyticsCardProps = {
  href: string;
  value: number;
  period: DashboardCardPeriod;
  variants: DashboardCardVariantConfig[];
  activeVariant: DashboardCardVariantConfig;
  isLoading?: boolean;
  onPeriodChange: (period: DashboardCardPeriod) => void;
  onVariantChange: (variantId: string) => void;
  className?: string;
};

export function InteractiveAnalyticsCard({
  href,
  value,
  period,
  variants,
  activeVariant,
  isLoading = false,
  onPeriodChange,
  onVariantChange,
  className,
}: InteractiveAnalyticsCardProps) {
  const Icon: LucideIcon = activeVariant.icon;

  return (
    <Card
      className={cn(
        "group relative overflow-visible shadow-none transition-colors hover:border-foreground/15",
        className,
      )}
    >
      <Link
        href={href}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="space-y-0 p-3 pb-1.5 sm:p-6 sm:pb-2">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <CardDescription className="truncate text-[11px] sm:text-sm">
                {activeVariant.label}
              </CardDescription>
              <CardTitle className="flex items-center gap-1.5 text-lg font-semibold tabular-nums sm:gap-2 sm:text-2xl">
                {formatMetricValue(value)}
                {isLoading ? (
                  <Loader2Icon className="size-3.5 animate-spin text-muted-foreground sm:size-4" />
                ) : null}
              </CardTitle>
            </div>
            <div className="rounded-md bg-primary/10 p-1.5 text-primary transition-colors group-hover:bg-primary/15 sm:rounded-lg sm:p-2">
              <Icon className="size-3.5 sm:size-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 pb-9 sm:p-6 sm:pb-11">
          <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
            {activeVariant.description}
          </p>
        </CardContent>
      </Link>

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <HoverIconMenu
          title="Period"
          icon={<Clock3Icon className="size-3.5" />}
          options={DASHBOARD_CARD_PERIOD_OPTIONS}
          activeId={period}
          onSelect={(id) => onPeriodChange(id as DashboardCardPeriod)}
          side="top"
          disabled={isLoading}
        />
        <HoverIconMenu
          title="Card view"
          icon={<Layers2Icon className="size-3.5" />}
          options={variants.map((variant) => ({
            id: variant.id,
            label: variant.label,
          }))}
          activeId={activeVariant.id}
          onSelect={onVariantChange}
          side="top"
          disabled={isLoading}
        />
      </div>
    </Card>
  );
}
