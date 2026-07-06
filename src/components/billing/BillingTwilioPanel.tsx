"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { purchaseTwilioPhoneNumberAction } from "@/features/twilio/actions/purchase-phone-number";
import { searchTwilioPhoneNumbersAction } from "@/features/twilio/actions/search-phone-numbers";
import {
  formatMonthlyPrice,
  TWILIO_COUNTRY_PRICING,
} from "@/features/twilio/country-pricing";
import type { BillingInvoiceItem, TwilioBillingData } from "@/types/billing.types";
import type { TwilioAvailablePhoneNumber } from "@/types/twilio-integration.types";

type BillingTwilioPanelProps = {
  data: TwilioBillingData;
  invoices: BillingInvoiceItem[];
  hasActivePaidSubscription: boolean;
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function BillingTwilioPanel({
  data,
  invoices,
  hasActivePaidSubscription,
}: BillingTwilioPanelProps) {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<
    TwilioAvailablePhoneNumber[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);

  const selectedPricing =
    TWILIO_COUNTRY_PRICING.find((entry) => entry.code === countryCode) ??
    TWILIO_COUNTRY_PRICING[0]!;

  async function handleSearch() {
    setIsSearching(true);

    try {
      const result = await searchTwilioPhoneNumbersAction({
        countryCode,
        areaCode: areaCode.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to search numbers.");
        setAvailableNumbers([]);
        return;
      }

      setAvailableNumbers(result.numbers);
    } finally {
      setIsSearching(false);
    }
  }

  async function handlePurchase(phoneNumber: string) {
    setPurchasingNumber(phoneNumber);

    try {
      const result = await purchaseTwilioPhoneNumberAction({
        phoneNumber,
        countryCode,
      });

      if (!result.success) {
        toast.error(result.message ?? "Purchase failed.");
        return;
      }

      toast.success("Phone number purchased and added to your subscription.");
      router.refresh();
    } finally {
      setPurchasingNumber(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{BILLING_MESSAGES.twilioPageTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {BILLING_MESSAGES.twilioPageDescription}
          </p>
        </div>
        <Link
          href={`${DASHBOARD_ROUTES.integrations}/voice`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Twilio settings
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
            {data.activePhoneNumber ?? data.accountFriendlyName ?? "Not connected"}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_MESSAGES.monthlyNumbers}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCents(data.monthlyNumberSpendCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data.numbers.length} active number{data.numbers.length === 1 ? "" : "s"}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Voice minutes (30d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.voiceMinutesLast30Days.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>SMS messages (30d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.smsCountLast30Days.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!data.isConnected ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Connect your Twilio account before purchasing numbers.
            </p>
            {data.isConnectConfigured ? (
              <Button asChild>
                <a href={data.connectUrl}>{BILLING_MESSAGES.connectTwilio}</a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {data.numbers.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Active numbers</CardTitle>
            <CardDescription>Billed monthly on your OrzuAI subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.numbers.map((number) => (
              <div
                key={number.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{number.phoneNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {number.countryLabel} · {formatMonthlyPrice(number.monthlyPriceCents)}/mo
                  </p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityChart
          data={data.callVolume}
          title="Call volume"
          description="Calls per day over the last 30 days."
        />
        <ActivityChart
          data={data.smsVolume}
          title="SMS volume"
          description="SMS messages per day over the last 30 days."
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{BILLING_MESSAGES.purchaseNumberTitle}</CardTitle>
          <CardDescription>{BILLING_MESSAGES.purchaseNumberDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasActivePaidSubscription ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {BILLING_MESSAGES.requiresPaidPlan}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="twilio-country">{BILLING_MESSAGES.countryLabel}</Label>
              <select
                id="twilio-country"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              >
                {TWILIO_COUNTRY_PRICING.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label} — {formatMonthlyPrice(country.monthlyPriceCents)}/mo
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-area">{BILLING_MESSAGES.areaCodeLabel}</Label>
              <Input
                id="twilio-area"
                value={areaCode}
                onChange={(event) => setAreaCode(event.target.value)}
                placeholder={countryCode === "US" ? "415" : ""}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={!data.isConnected || isSearching}
                onClick={() => {
                  void handleSearch();
                }}
              >
                {isSearching ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {BILLING_MESSAGES.searchNumbers}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {BILLING_MESSAGES.numberMonthlyPrice(
              formatMonthlyPrice(selectedPricing.monthlyPriceCents),
            )}
          </p>

          {availableNumbers.length > 0 ? (
            <div className="space-y-2">
              {availableNumbers.map((number) => (
                <div
                  key={number.phoneNumber}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{number.phoneNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {[number.locality, number.region].filter(Boolean).join(", ") ||
                        selectedPricing.label}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !hasActivePaidSubscription ||
                      purchasingNumber === number.phoneNumber
                    }
                    onClick={() => {
                      void handlePurchase(number.phoneNumber);
                    }}
                  >
                    {purchasingNumber === number.phoneNumber ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : null}
                    {BILLING_MESSAGES.buyNumber}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <BillingInvoicesTable invoices={invoices} />
    </div>
  );
}
