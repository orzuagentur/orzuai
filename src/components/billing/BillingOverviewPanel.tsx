"use client";

import Link from "next/link";
import { ArrowUpRightIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";

import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { BillingPaymentMethodCard } from "@/components/billing/BillingPaymentMethodCard";
import { SubscriptionHub } from "@/components/subscription/SubscriptionHub";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { createBillingPortalAction } from "@/features/subscription/actions/create-billing-portal";
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
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <BillingPaymentMethodCard
          paymentMethod={data.paymentMethod}
          onManage={
            data.hasStripeCustomer
              ? async () => {
                  const result = await createBillingPortalAction();

                  if (result.success) {
                    window.location.href = result.url;
                  }
                }
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
              href={DASHBOARD_ROUTES.subscriptionWhatsApp}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <MessageCircleIcon className="size-5 text-emerald-600" />
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

      <BillingInvoicesTable invoices={data.recentInvoices} />

      <SubscriptionHub data={data} embedded />
    </div>
  );
}
