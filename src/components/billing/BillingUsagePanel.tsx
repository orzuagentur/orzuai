"use client";

import Link from "next/link";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { isUnlimitedQuota } from "@/features/subscription/entitlements";
import type { UsageSpendingData } from "@/services/billing-usage.service";

type BillingUsagePanelProps = {
  data: UsageSpendingData;
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function UsageBar({ percent }: { percent: number | null }) {
  if (percent === null) {
    return null;
  }

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

export function BillingUsagePanel({ data }: BillingUsagePanelProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">{BILLING_MESSAGES.usagePageTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {BILLING_MESSAGES.usagePageDescription}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="text-xl">{data.currentPlanLabel}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground capitalize">
            {data.subscriptionStatus} · ${data.currentPlanPriceMonthly}/mo
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Forecast spend</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCents(data.forecastMonthlySpendCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Plan + Twilio numbers + WhatsApp estimate
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>AI replies</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.aiUsed.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isUnlimitedQuota(data.aiLimit)
              ? "Unlimited"
              : `${data.aiPercent}% of ${data.aiLimit.toLocaleString()} limit`}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Voice minutes</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.voiceUsed.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data.voiceLimit > 0
              ? `${data.voicePercent}% of ${data.voiceLimit.toLocaleString()} min`
              : "Not included on current plan"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">AI usage trend</CardTitle>
            <CardDescription>Daily AI replies over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart
              data={data.aiDailyUsage.map((point) => ({
                label: point.label,
                value: point.value,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Plan limits</CardTitle>
            <CardDescription>Remaining capacity on your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Channels</span>
                <span className="tabular-nums text-muted-foreground">
                  {data.channelsUsed} / {isUnlimitedQuota(data.channelsLimit) ? "∞" : data.channelsLimit}
                </span>
              </div>
              <UsageBar
                percent={
                  data.channelsLimit > 0 && !isUnlimitedQuota(data.channelsLimit)
                    ? Math.round((data.channelsUsed / data.channelsLimit) * 100)
                    : null
                }
              />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Automations</span>
                <span className="tabular-nums text-muted-foreground">
                  {data.automationsUsed} /{" "}
                  {isUnlimitedQuota(data.automationsLimit)
                    ? "∞"
                    : data.automationsLimit || "—"}
                </span>
              </div>
              <UsageBar
                percent={
                  data.automationsLimit > 0 && !isUnlimitedQuota(data.automationsLimit)
                    ? Math.round((data.automationsUsed / data.automationsLimit) * 100)
                    : null
                }
              />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>AI replies</span>
                <span className="tabular-nums text-muted-foreground">
                  {data.aiUsed} / {isUnlimitedQuota(data.aiLimit) ? "∞" : data.aiLimit}
                </span>
              </div>
              <UsageBar percent={data.aiPercent || null} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Usage by service</CardTitle>
          <CardDescription>Spend and consumption breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.serviceBreakdown.map((service) => (
            <div
              key={service.id}
              className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{service.label}</p>
                <p className="text-sm text-muted-foreground">{service.usageLabel}</p>
                <p className="text-xs text-muted-foreground">{service.limitLabel}</p>
              </div>
              <div className="text-right">
                {service.spentCents > 0 ? (
                  <p className="font-semibold tabular-nums">
                    {formatCents(service.spentCents)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Included</p>
                )}
                <UsageBar percent={service.percent} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={DASHBOARD_ROUTES.subscriptionTwilio}
          className="text-sm text-primary hover:underline"
        >
          Twilio usage details →
        </Link>
        <Link
          href={DASHBOARD_ROUTES.subscriptionWhatsApp}
          className="text-sm text-primary hover:underline"
        >
          WhatsApp usage details →
        </Link>
        <Link
          href={DASHBOARD_ROUTES.subscriptionPayments}
          className="text-sm text-primary hover:underline"
        >
          Payment history →
        </Link>
      </div>
    </div>
  );
}
