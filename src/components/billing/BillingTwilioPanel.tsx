"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
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
import { createTwilioTopUpAction } from "@/features/billing/actions/create-twilio-topup";
import { quoteTwilioTopUpAction } from "@/features/billing/actions/quote-twilio-topup";
import { refreshTwilioBillingAction } from "@/features/billing/actions/refresh-twilio-billing";
import { purchaseTwilioPhoneNumberAction } from "@/features/twilio/actions/purchase-phone-number";
import { searchTwilioPhoneNumbersAction } from "@/features/twilio/actions/search-phone-numbers";
import {
  formatMonthlyPrice,
  TWILIO_COUNTRY_PRICING,
} from "@/features/twilio/country-pricing";
import type { TwilioBillingData } from "@/types/billing.types";
import type { TwilioAvailablePhoneNumber } from "@/types/twilio-integration.types";

type BillingTwilioPanelProps = {
  data: TwilioBillingData;
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
  const [topUpAmount, setTopUpAmount] = useState("25");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpQuote, setTopUpQuote] = useState<{
    creditCents: number;
    feeCents: number;
    chargedCents: number;
    feePercent: number;
  } | null>(null);
  const [walletBalanceCents, setWalletBalanceCents] = useState(data.walletBalanceCents);
  const [providerBalanceCents, setProviderBalanceCents] = useState<number | null>(
    data.balanceCents,
  );
  const [balanceError, setBalanceError] = useState<string | null>(data.balanceError);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState<string | null>(
    data.balanceUpdatedAt,
  );

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

  async function handleRefreshBalance() {
    setIsRefreshingBalance(true);

    try {
      const result = await refreshTwilioBillingAction();

      if (!result.success) {
        toast.error("Unable to refresh Twilio balance.");
        return;
      }

      setWalletBalanceCents(result.walletBalanceCents);
      setProviderBalanceCents(result.balanceCents);
      setBalanceError(result.balanceError);
      setBalanceUpdatedAt(result.balanceUpdatedAt);

      if (result.balanceError) {
        toast.message("Twilio balance unavailable", {
          description: result.balanceError,
        });
      } else {
        toast.success("Twilio balance updated.");
      }

      router.refresh();
    } finally {
      setIsRefreshingBalance(false);
    }
  }

  async function handleTopUpQuote(amount: string) {
    const dollars = Number.parseFloat(amount);

    if (Number.isNaN(dollars) || dollars < 5) {
      setTopUpQuote(null);
      return;
    }

    const result = await quoteTwilioTopUpAction({
      creditCents: Math.round(dollars * 100),
    });

    if (result.success) {
      setTopUpQuote(result.quote);
    }
  }

  async function handleTopUp() {
    const dollars = Number.parseFloat(topUpAmount);

    if (Number.isNaN(dollars) || dollars < 5) {
      toast.error("Minimum top-up is $5.");
      return;
    }

    setIsToppingUp(true);

    try {
      const result = await createTwilioTopUpAction({
        amountCents: Math.round(dollars * 100),
      });

      if (!result.success) {
        toast.error(result.message ?? "Top-up failed.");
        return;
      }

      window.location.href = result.url;
    } finally {
      setIsToppingUp(false);
    }
  }

  const isCustomerBilling = data.billingOwner === "customer";
  const displayBalanceCents = isCustomerBilling
    ? providerBalanceCents
    : walletBalanceCents;

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
        <Card className="shadow-none sm:col-span-2 xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription>{BILLING_MESSAGES.twilioBalance}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {displayBalanceCents !== null ? formatCents(displayBalanceCents) : "—"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={isRefreshingBalance}
                  onClick={() => {
                    void handleRefreshBalance();
                  }}
                  aria-label={BILLING_MESSAGES.twilioBalanceRefresh}
                >
                  {isRefreshingBalance ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                </Button>
                {data.isConnected && isCustomerBilling ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={data.twilioConsoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {BILLING_MESSAGES.twilioConsoleTopUp}
                    </a>
                  </Button>
                ) : null}
                {data.isConnected && !isCustomerBilling ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTopUpForm((current) => !current);
                      if (!showTopUpForm) {
                        void handleTopUpQuote(topUpAmount);
                      }
                    }}
                  >
                    {BILLING_MESSAGES.twilioTopUp}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              {isCustomerBilling
                ? BILLING_MESSAGES.twilioBalanceDescription
                : BILLING_MESSAGES.twilioCreditsDescription}
            </p>
            {data.balanceSource === "parent" ? (
              <p>{BILLING_MESSAGES.twilioBalanceParentNote}</p>
            ) : null}
            {balanceError ? <p className="text-amber-700">{balanceError}</p> : null}
            {balanceUpdatedAt ? (
              <p>Updated {new Date(balanceUpdatedAt).toLocaleString()}</p>
            ) : null}
            {showTopUpForm && !isCustomerBilling ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="twilio-topup-amount">Credit amount (USD)</Label>
                    <Input
                      id="twilio-topup-amount"
                      type="number"
                      min={5}
                      step={5}
                      value={topUpAmount}
                      onChange={(event) => {
                        setTopUpAmount(event.target.value);
                        void handleTopUpQuote(event.target.value);
                      }}
                      className="w-32"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={isToppingUp}
                    onClick={() => {
                      void handleTopUp();
                    }}
                  >
                    {isToppingUp ? <Loader2Icon className="size-4 animate-spin" /> : null}
                    Continue to payment
                  </Button>
                </div>
                {topUpQuote ? (
                  <div className="mt-3 space-y-1 text-sm text-foreground">
                    <p>
                      Credit: {formatCents(topUpQuote.creditCents)} · Fee:{" "}
                      {formatCents(topUpQuote.feeCents)} · Total:{" "}
                      <span className="font-medium">
                        {formatCents(topUpQuote.chargedCents)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {BILLING_MESSAGES.twilioTopUpFeeNote(topUpQuote.feePercent)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs">
                    {BILLING_MESSAGES.twilioTopUpFeeNote(data.topUpFeePercent)}
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_MESSAGES.twilioVoiceRate}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.voiceRateCentsPerMinute
                ? formatCents(data.voiceRateCentsPerMinute)
                : "—"}
              <span className="text-sm font-normal text-muted-foreground"> / min</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_MESSAGES.twilioSmsRate}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.smsRateCents ? formatCents(data.smsRateCents) : "—"}
              <span className="text-sm font-normal text-muted-foreground"> / SMS</span>
            </CardTitle>
          </CardHeader>
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

      {data.isConnected ? null : (
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
      )}

      {data.numbers.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Active numbers</CardTitle>
            <CardDescription>Billed monthly on your OrzuX subscription.</CardDescription>
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
          description="Calls per day over time. Use the clock to change the period."
          valueNoun="calls"
          initialDays={30}
          strokeColor="rgb(14 165 233)"
          fillId="billingCallVolumeFill"
        />
        <ActivityChart
          data={data.smsVolume}
          title="SMS volume"
          description="SMS messages per day over time. Use the clock to change the period."
          valueNoun="SMS"
          initialDays={30}
          strokeColor="rgb(16 185 129)"
          fillId="billingSmsVolumeFill"
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

      {data.topUpHistory.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Top-up history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topUpHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCents(entry.amountCents)}
                </span>
                <Badge variant="outline" className="capitalize">
                  {entry.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
