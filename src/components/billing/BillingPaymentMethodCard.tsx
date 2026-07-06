"use client";

import { CreditCardIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import type { BillingPaymentMethod } from "@/types/billing.types";

type BillingPaymentMethodCardProps = {
  paymentMethod: BillingPaymentMethod | null;
  onManage?: () => void;
  isManaging?: boolean;
};

function formatBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function BillingPaymentMethodCard({
  paymentMethod,
  onManage,
  isManaging,
}: BillingPaymentMethodCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCardIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">
              {BILLING_MESSAGES.paymentMethodTitle}
            </CardTitle>
            <CardDescription>
              {BILLING_MESSAGES.paymentMethodDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethod ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">
              {formatBrand(paymentMethod.brand)} •••• {paymentMethod.last4}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Expires {String(paymentMethod.expMonth).padStart(2, "0")}/
              {paymentMethod.expYear}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {BILLING_MESSAGES.paymentMethodEmpty}
          </p>
        )}

        {onManage ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isManaging}
            onClick={onManage}
          >
            {BILLING_MESSAGES.paymentMethodManage}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
