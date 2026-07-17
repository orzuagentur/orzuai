"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import type { WhatsAppBillingData } from "@/types/billing.types";

type BillingWhatsAppPanelProps = {
  data: WhatsAppBillingData;
};

function formatCents(cents: number | null): string {
  if (cents == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function BillingWhatsAppPanel({ data }: BillingWhatsAppPanelProps) {
  const chartData = data.messagesLast30Days.map((point) => ({
    label: point.label,
    value: point.value,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{BILLING_MESSAGES.whatsappPageTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {BILLING_MESSAGES.whatsappPageDescription}
          </p>
        </div>
        <Link
          href={`${DASHBOARD_ROUTES.integrations}/whatsapp`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Integration settings
          <ExternalLinkIcon className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant={data.isConnected ? "default" : "secondary"}>
                {data.isConnected
                  ? BILLING_MESSAGES.connected
                  : BILLING_MESSAGES.disconnected}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.phoneNumber ?? "No number connected"}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Messages</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.totalMessages.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Contacts</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.totalContacts.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_MESSAGES.monthlySpend}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCents(data.estimatedMonthlySpendCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Estimated 360dialog / Meta conversation fees
          </CardContent>
        </Card>
      </div>

      <ActivityChart
        data={chartData}
        title="WhatsApp message volume"
        description="Messages per day over time. Use the clock to change the period."
        valueNoun="messages"
        initialDays={30}
        strokeColor="rgb(37 211 102)"
        fillId="billingWhatsappVolumeFill"
      />

    </div>
  );
}
