"use client";

import {
  ArrowUpRightIcon,
  BotIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  GaugeIcon,
  Loader2Icon,
  MicIcon,
  PackagePlusIcon,
  PlugIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createBillingPortalAction } from "@/features/subscription/actions/create-billing-portal";
import { createCheckoutSessionAction } from "@/features/subscription/actions/create-checkout-session";
import { purchaseSubscriptionAddonAction } from "@/features/subscription/actions/purchase-subscription-addon";
import { PASS_THROUGH_SERVICES } from "@/features/subscription/add-ons";
import { SUBSCRIPTION_MESSAGES } from "@/features/subscription/constants";
import { isUnlimitedQuota } from "@/features/subscription/entitlements";
import { isUnlimitedAiReplies } from "@/features/subscription/plans";
import { cn } from "@/lib/utils";
import type {
  SubscriptionAddOnCard,
  SubscriptionPageData,
  SubscriptionPlanCard,
} from "@/types/subscription.types";

type SubscriptionHubProps = {
  data: SubscriptionPageData;
  embedded?: boolean;
};

type UsageMetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  percent?: number | null;
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatQuota(used: number, limit: number, unit: string): string {
  if (limit <= 0) {
    return `${formatNumber(used)} ${unit} - not included`;
  }

  if (isUnlimitedQuota(limit)) {
    return `${formatNumber(used)} ${unit} - unlimited`;
  }

  return `${formatNumber(used)} / ${formatNumber(limit)} ${unit}`;
}

function quotaPercent(used: number, limit: number): number | null {
  if (limit <= 0 || isUnlimitedQuota(limit)) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function statusClassName(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active" || normalized === "trialing") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (normalized === "canceled" || normalized === "incomplete_expired") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-border bg-muted text-muted-foreground";
}

function planPrice(plan: SubscriptionPlanCard): string {
  return plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`;
}

function UsageMetricCard({
  title,
  value,
  detail,
  icon: Icon,
  percent,
}: UsageMetricCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-1 text-xl tabular-nums">{value}</CardTitle>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{detail}</p>
        {percent !== null && percent !== undefined ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PlanFeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {features.map((feature) => (
        <li key={feature} className="flex gap-2">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function AddOnRow({
  addOn,
  loadingAddon,
  disabled,
  onPurchase,
}: {
  addOn: SubscriptionAddOnCard;
  loadingAddon: string | null;
  disabled: boolean;
  onPurchase: (addonId: string) => void;
}) {
  const isLoading = loadingAddon === addOn.id;

  return (
    <div className="flex flex-col gap-4 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{addOn.label}</p>
          {addOn.activeQuantity > 0 ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {SUBSCRIPTION_MESSAGES.addonActiveLabel} x{addOn.activeQuantity}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{addOn.description}</p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <p className="text-sm font-semibold tabular-nums">${addOn.priceMonthly}/mo</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isLoading}
          onClick={() => onPurchase(addOn.id)}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Adding
            </>
          ) : (
            <>
              <PackagePlusIcon className="size-4" />
              Add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function SubscriptionHub({ data, embedded = false }: SubscriptionHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingAddon, setLoadingAddon] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const aiUsageLabel = isUnlimitedAiReplies(data.monthlyLimit)
    ? `${formatNumber(data.usedReplies)} used`
    : `${formatNumber(data.usedReplies)} / ${formatNumber(data.monthlyLimit)}`;
  const aiUsageDetail = isUnlimitedAiReplies(data.monthlyLimit)
    ? "AI replies included without a monthly cap"
    : `${data.usagePercent}% of monthly AI reply quota used`;
  const aiUsagePercent = isUnlimitedAiReplies(data.monthlyLimit)
    ? null
    : Math.min(100, data.usagePercent);

  useEffect(() => {
    const checkout = searchParams.get("checkout");

    if (checkout === "success") {
      toast.success(SUBSCRIPTION_MESSAGES.successTitle, {
        description: SUBSCRIPTION_MESSAGES.successDescription,
      });
    } else if (checkout === "canceled") {
      toast.message(SUBSCRIPTION_MESSAGES.canceledTitle, {
        description: SUBSCRIPTION_MESSAGES.canceledDescription,
      });
    }
  }, [searchParams]);

  async function handleUpgrade(planId: string) {
    if (planId === "free" || planId === data.currentPlanId) {
      return;
    }

    setLoadingPlan(planId);

    try {
      const result = await createCheckoutSessionAction({ planId });

      if (!result.success) {
        toast.error(result.message ?? SUBSCRIPTION_MESSAGES.checkoutFailed);
        return;
      }

      window.location.href = result.url;
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePurchaseAddon(addonId: string) {
    if (!data.hasActivePaidSubscription) {
      toast.message(SUBSCRIPTION_MESSAGES.addonRequiresPaidPlan);
      return;
    }

    setLoadingAddon(addonId);

    try {
      const result = await purchaseSubscriptionAddonAction({ addonId });

      if (!result.success) {
        toast.error(result.message ?? SUBSCRIPTION_MESSAGES.addonFailed);
        return;
      }

      toast.success(SUBSCRIPTION_MESSAGES.addonAddedTitle, {
        description: SUBSCRIPTION_MESSAGES.addonAddedDescription,
      });
      router.refresh();
    } finally {
      setLoadingAddon(null);
    }
  }

  async function handleManageBilling() {
    setIsOpeningPortal(true);

    try {
      const result = await createBillingPortalAction();

      if (!result.success) {
        toast.error(result.message ?? SUBSCRIPTION_MESSAGES.portalFailed);
        return;
      }

      window.location.href = result.url;
    } finally {
      setIsOpeningPortal(false);
    }
  }

  return (
    <div className={embedded ? "space-y-6" : "flex flex-1 flex-col gap-6 p-4 md:p-6"}>
      {!embedded && !data.stripeConfigured ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {SUBSCRIPTION_MESSAGES.stripeMissing}
        </div>
      ) : null}

      {!embedded ? (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card className="shadow-none">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletCardsIcon className="size-5" />
                </div>
                <div>
                  <CardDescription>Billing overview</CardDescription>
                  <CardTitle className="mt-1 text-2xl">
                    {SUBSCRIPTION_MESSAGES.pageTitle}
                  </CardTitle>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("capitalize", statusClassName(data.subscriptionStatus))}
              >
                {data.subscriptionStatus}
              </Badge>
            </div>
            <CardDescription className="max-w-2xl">
              Review plan usage, compare packages, and manage Stripe billing in
              one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {SUBSCRIPTION_MESSAGES.currentPlan}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {data.currentPlanLabel}
                </p>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {data.currentPlanTagline}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-muted-foreground">AI replies</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {aiUsageLabel}
                </p>
              </div>
            </div>

            {aiUsagePercent !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{SUBSCRIPTION_MESSAGES.usage}</span>
                  <span>{data.usagePercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${data.usagePercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CreditCardIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Payment controls</CardTitle>
                <CardDescription>Invoices, cards, and plan changes.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.hasStripeCustomer ? (
              <Button
                type="button"
                className="w-full justify-between"
                variant="secondary"
                disabled={isOpeningPortal || !data.stripeConfigured}
                onClick={() => {
                  void handleManageBilling();
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {isOpeningPortal ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ReceiptTextIcon className="size-4" />
                  )}
                  {isOpeningPortal
                    ? "Opening billing portal"
                    : SUBSCRIPTION_MESSAGES.manageBilling}
                </span>
                {!isOpeningPortal ? <ArrowUpRightIcon className="size-4" /> : null}
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Free plan - no payment method required.
              </div>
            )}

            <div className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Stripe customer</span>
                <span className="font-medium text-foreground">
                  {data.hasStripeCustomer ? "Ready" : "Not created"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Paid subscription</span>
                <span className="font-medium text-foreground">
                  {data.hasActivePaidSubscription ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UsageMetricCard
          title="AI replies"
          value={aiUsageLabel}
          detail={aiUsageDetail}
          icon={BotIcon}
          percent={aiUsagePercent}
        />
        <UsageMetricCard
          title="Connected channels"
          value={formatNumber(data.usage.connectedChannels)}
          detail={formatQuota(
            data.usage.connectedChannels,
            data.usage.maxChannels,
            "channels",
          )}
          icon={PlugIcon}
          percent={quotaPercent(data.usage.connectedChannels, data.usage.maxChannels)}
        />
        <UsageMetricCard
          title="Voice minutes"
          value={formatNumber(data.usage.usedVoiceMinutes)}
          detail={formatQuota(
            data.usage.usedVoiceMinutes,
            data.usage.monthlyVoiceLimit,
            "voice min",
          )}
          icon={MicIcon}
          percent={quotaPercent(
            data.usage.usedVoiceMinutes,
            data.usage.monthlyVoiceLimit,
          )}
        />
        <UsageMetricCard
          title="Automations"
          value={formatNumber(data.usage.automationCount)}
          detail={formatQuota(
            data.usage.automationCount,
            data.usage.maxAutomations,
            "automations",
          )}
          icon={ZapIcon}
          percent={quotaPercent(data.usage.automationCount, data.usage.maxAutomations)}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Plans</h2>
            <p className="text-sm text-muted-foreground">
              Choose the package that matches your channels, AI volume, and team size.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            Current: {data.currentPlanLabel}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.plans.map((plan) => {
            const isCurrent = plan.id === data.currentPlanId;
            const isFree = plan.id === "free";
            const isLoading = loadingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col shadow-none",
                  plan.highlighted && "border-primary ring-1 ring-primary/20",
                  isCurrent && "border-primary/70",
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{plan.label}</CardTitle>
                      <CardDescription className="mt-1">{plan.tagline}</CardDescription>
                    </div>
                    {isCurrent ? <Badge>Current</Badge> : null}
                  </div>
                  <div className="pt-3">
                    <span className="text-3xl font-semibold tabular-nums">
                      {planPrice(plan)}
                    </span>
                    {plan.priceMonthly > 0 ? (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <PlanFeatureList features={plan.features} />
                  <Button
                    type="button"
                    className="mt-auto w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    disabled={
                      isCurrent ||
                      isFree ||
                      !data.stripeConfigured ||
                      isLoading
                    }
                    onClick={() => {
                      void handleUpgrade(plan.id);
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Redirecting
                      </>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isFree ? (
                      "Free plan"
                    ) : (
                      <>
                        <GaugeIcon className="size-4" />
                        {SUBSCRIPTION_MESSAGES.upgrade}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackagePlusIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Add-ons</CardTitle>
                <CardDescription>
                  Increase usage without changing the base plan.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-t">
              {data.addOns.map((addOn) => (
                <AddOnRow
                  key={addOn.id}
                  addOn={addOn}
                  loadingAddon={loadingAddon}
                  disabled={
                    !addOn.purchasable ||
                    !data.stripeConfigured ||
                    !data.hasActivePaidSubscription
                  }
                  onPurchase={(addonId) => {
                    void handlePurchaseAddon(addonId);
                  }}
                />
              ))}
            </div>
            {!data.hasActivePaidSubscription ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {SUBSCRIPTION_MESSAGES.addonRequiresPaidPlan}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {!embedded ? (
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ShieldCheckIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Pass-through services</CardTitle>
                <CardDescription>
                  Provider usage billed by connected accounts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {PASS_THROUGH_SERVICES.map((service) => (
              <div key={service.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium">{service.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{service.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        ) : null}
      </div>
    </div>
  );
}
