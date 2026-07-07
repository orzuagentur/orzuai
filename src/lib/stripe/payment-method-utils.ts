import type Stripe from "stripe";

const SUBSCRIPTION_BILLING_REASONS = new Set([
  "subscription_create",
  "subscription_cycle",
  "subscription_update",
  "subscription_threshold",
]);

const BANK_DEBIT_PAYMENT_METHOD_TYPES = new Set([
  "us_bank_account",
  "sepa_debit",
  "bacs_debit",
  "acss_debit",
  "au_becs_debit",
  "nz_bank_account",
]);

type StripeInvoiceWithRelations = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
  subscription?: string | Stripe.Subscription | null;
};

function asStripeInvoiceWithRelations(
  invoice: Stripe.Invoice,
): StripeInvoiceWithRelations {
  return invoice as StripeInvoiceWithRelations;
}

export function isSubscriptionInvoice(invoice: Stripe.Invoice): boolean {
  const normalized = asStripeInvoiceWithRelations(invoice);

  if (normalized.subscription) {
    return true;
  }

  const billingReason = invoice.billing_reason ?? "";

  return SUBSCRIPTION_BILLING_REASONS.has(billingReason);
}

export function isBankDebitPaymentMethodType(type: string | null | undefined): boolean {
  if (!type?.trim()) {
    return false;
  }

  return BANK_DEBIT_PAYMENT_METHOD_TYPES.has(type.trim());
}

export function isCardPaymentMethodType(type: string | null | undefined): boolean {
  return type?.trim() === "card";
}

export function formatCardExpiryLabel(
  expMonth: number,
  expYear: number,
): string {
  const month = String(expMonth).padStart(2, "0");
  return `${month}/${expYear}`;
}

export function isCardExpiringBeforeDate(input: {
  expMonth: number;
  expYear: number;
  beforeDate: Date;
}): boolean {
  const expiryEnd = new Date(input.expYear, input.expMonth, 0, 23, 59, 59, 999);
  return expiryEnd.getTime() <= input.beforeDate.getTime();
}

export function formatCardBrandLabel(brand: string | null | undefined): string {
  if (!brand?.trim()) {
    return "Card";
  }

  return brand
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
