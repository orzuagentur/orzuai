"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

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
import {
  PASS_THROUGH_SERVICES,
  SUBSCRIPTION_ADD_ONS,
} from "@/features/subscription/add-ons";
import { isUnlimitedQuota } from "@/features/subscription/entitlements";
import { SUBSCRIPTION_MESSAGES } from "@/features/subscription/constants";
import type { SubscriptionPlanId } from "@/features/subscription/plans";
import { isUnlimitedAiReplies } from "@/features/subscription/plans";
import type { SubscriptionPageData } from "@/types/subscription.types";

type SubscriptionHubProps = {
  data: SubscriptionPageData;
};

function formatQuota(used: number, limit: number, unit: string): string {
  if (limit <= 0) {
    return `${used} ${unit} · not included on this plan`;
  }

  if (isUnlimitedQuota(limit)) {
    return `${used.toLocaleString()} ${unit} · unlimited`;
  }

  return `${used.toLocaleString()} / ${limit.toLocaleString()} ${unit}`;
}

export function SubscriptionHub({ data }: SubscriptionHubProps) {
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(
    null,
  );
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

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

  async function handleUpgrade(planId: SubscriptionPlanId) {
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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {!data.stripeConfigured ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          {SUBSCRIPTION_MESSAGES.stripeMissing}
        </div>
      ) : null}

      <Card className="max-w-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{SUBSCRIPTION_MESSAGES.currentPlan}</CardTitle>
          <CardDescription>
            {data.currentPlanLabel} · {data.currentPlanTagline} ·{" "}
            {SUBSCRIPTION_MESSAGES.status}:{" "}
            <span className="capitalize">{data.subscriptionStatus}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {SUBSCRIPTION_MESSAGES.usage}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {isUnlimitedAiReplies(data.monthlyLimit)
                  ? `${data.usedReplies.toLocaleString()} AI replies (unlimited)`
                  : `${data.usedReplies.toLocaleString()} / ${data.monthlyLimit.toLocaleString()} AI replies (${data.usagePercent}%)`}
              </p>
              {!isUnlimitedAiReplies(data.monthlyLimit) ? (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${data.usagePercent}%` }}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {formatQuota(
                  data.usage.connectedChannels,
                  data.usage.maxChannels,
                  "channels",
                )}
              </p>
              <p>
                {formatQuota(
                  data.usage.usedVoiceMinutes,
                  data.usage.monthlyVoiceLimit,
                  "voice min",
                )}
              </p>
              <p>
                {formatQuota(
                  data.usage.automationCount,
                  data.usage.maxAutomations,
                  "automations",
                )}
              </p>
            </div>
          </div>

          {data.hasStripeCustomer ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isOpeningPortal || !data.stripeConfigured}
              onClick={() => {
                void handleManageBilling();
              }}
            >
              {isOpeningPortal ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <CreditCardIcon className="size-4" />
                  {SUBSCRIPTION_MESSAGES.manageBilling}
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {SUBSCRIPTION_MESSAGES.freePlanNote}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((plan) => {
          const isCurrent = plan.id === data.currentPlanId;
          const isFree = plan.id === "free";

          return (
            <Card
              key={plan.id}
              className={
                plan.highlighted
                  ? "border-primary shadow-none ring-1 ring-primary/20"
                  : "shadow-none"
              }
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.label}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="pt-1 text-2xl font-semibold tabular-nums">
                  {plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`}
                  {plan.priceMonthly > 0 ? (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  ) : null}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={
                    isCurrent ||
                    isFree ||
                    !data.stripeConfigured ||
                    loadingPlan === plan.id
                  }
                  onClick={() => {
                    void handleUpgrade(plan.id);
                  }}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    SUBSCRIPTION_MESSAGES.upgrade
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Add-ons</CardTitle>
            <CardDescription>
              Scale AI replies, voice minutes, or team seats without changing your base plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SUBSCRIPTION_ADD_ONS.map((addOn) => (
              <div
                key={addOn.id}
                className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{addOn.label}</p>
                  <p className="text-xs text-muted-foreground">{addOn.description}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  ${addOn.priceMonthly}/mo
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Contact support to attach add-ons to your subscription.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Pass-through services</CardTitle>
            <CardDescription>
              These providers bill your own account directly. OrzuX connects them — usage is not
              included in platform subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PASS_THROUGH_SERVICES.map((service) => (
              <div key={service.id} className="rounded-lg border px-3 py-2.5">
                <p className="text-sm font-medium">{service.label}</p>
                <p className="text-xs text-muted-foreground">{service.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
