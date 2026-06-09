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
import { SUBSCRIPTION_MESSAGES } from "@/features/subscription/constants";
import type { SubscriptionPlanId } from "@/features/subscription/plans";
import type { SubscriptionPageData } from "@/types/subscription.types";

type SubscriptionHubProps = {
  data: SubscriptionPageData;
};

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
            {data.currentPlanLabel} · {SUBSCRIPTION_MESSAGES.status}:{" "}
            <span className="capitalize">{data.subscriptionStatus}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {SUBSCRIPTION_MESSAGES.usage}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {data.usedReplies} / {data.monthlyLimit} AI replies ({data.usagePercent}%)
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${data.usagePercent}%` }}
              />
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
                <CardDescription>
                  {plan.priceMonthly === 0
                    ? "Free"
                    : `$${plan.priceMonthly}/month`}
                </CardDescription>
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
    </div>
  );
}
