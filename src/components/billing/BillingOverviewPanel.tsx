"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";

import { BillingPaymentMethodCard } from "@/components/billing/BillingPaymentMethodCard";
import { SubscriptionHub } from "@/components/subscription/SubscriptionHub";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { updatePaymentMethodAction } from "@/features/subscription/actions/update-payment-method";
import type { SubscriptionPageData } from "@/types/subscription.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BillingOverviewPanelProps = {
  data: SubscriptionPageData;
};

export function BillingOverviewPanel({ data }: BillingOverviewPanelProps) {
  const [isUpdatingPaymentMethod, setIsUpdatingPaymentMethod] = useState(false);

  async function handleUpdatePaymentMethod() {
    setIsUpdatingPaymentMethod(true);

    try {
      const result = await updatePaymentMethodAction();

      if (!result.success) {
        toast.error(result.message ?? "Unable to update payment method.");
        return;
      }

      window.location.href = result.url;
    } finally {
      setIsUpdatingPaymentMethod(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <BillingPaymentMethodCard
          paymentMethod={data.paymentMethod}
          isManaging={isUpdatingPaymentMethod}
          onManage={
            data.stripeConfigured && data.hasBusiness
              ? handleUpdatePaymentMethod
              : undefined
          }
        />
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              {BILLING_MESSAGES.serviceCardsTitle}
            </CardTitle>
            <CardDescription>
              Provider-specific usage, spend, and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={DASHBOARD_ROUTES.subscriptionUsage}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="font-medium">Usage & Spending</p>
                <p className="text-sm text-muted-foreground">
                  Limits, forecasts, and service breakdown
                </p>
              </div>
              <ArrowUpRightIcon className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href={DASHBOARD_ROUTES.subscriptionWhatsApp}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <MessageCircleIcon className="size-5 text-zinc-600" />
                <div>
                  <p className="font-medium">{BILLING_MESSAGES.whatsappCardTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {BILLING_MESSAGES.whatsappCardDescription}
                  </p>
                </div>
              </div>
              <ArrowUpRightIcon className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href={DASHBOARD_ROUTES.subscriptionTwilio}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <PhoneIcon className="size-5 text-primary" />
                <div>
                  <p className="font-medium">{BILLING_MESSAGES.twilioCardTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {BILLING_MESSAGES.twilioCardDescription}
                  </p>
                </div>
              </div>
              <ArrowUpRightIcon className="size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <SubscriptionHub data={data} embedded />
    </div>
  );
}
