import "server-only";

import type Stripe from "stripe";

import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "@/features/subscription/plans";
import { formatStripeMoney } from "@/lib/email/templates/subscription-billing-email";
import {
  formatCardBrandLabel,
  formatCardExpiryLabel,
  isBankDebitPaymentMethodType,
  isCardExpiringBeforeDate,
  isCardPaymentMethodType,
  isSubscriptionInvoice,
} from "@/lib/stripe/payment-method-utils";
import {
  resolveDefaultCardDetailsForCustomer,
  resolveInvoicePaymentMethodType,
} from "@/lib/stripe/invoice-payment-method";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasBillingEmailBeenSent } from "@/services/billing-email-dedupe.service";
import { isEmailTemplateActive } from "@/services/email-template-config.service";
import {
  sendCardExpiringEmail,
  sendPaymentBankFailedEmail,
  sendPaymentCardFailedEmail,
  sendSubscriptionPlanChangedEmail,
  sendSubscriptionPurchasedEmail,
  sendSubscriptionRenewedEmail,
} from "@/services/email.service";

function getPlanLabel(planId: string): string {
  const normalized = planId.trim().toLowerCase() as SubscriptionPlanId;
  return SUBSCRIPTION_PLANS[normalized]?.label ?? planId;
}

async function resolveBusinessBillingRecipient(
  businessId: string,
): Promise<{ email: string; userId: string } | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("user_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business?.user_id) {
    return null;
  }

  const { data: userData, error } = await admin.auth.admin.getUserById(
    business.user_id,
  );

  if (error || !userData.user?.email) {
    return null;
  }

  return {
    email: userData.user.email,
    userId: business.user_id,
  };
}

export async function getBusinessSubscriptionPlan(
  businessId: string,
): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  return (data?.subscription_plan as string | null) ?? null;
}

export async function notifySubscriptionPurchased(input: {
  businessId: string;
  planId: string;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<void> {
  if (!(await isEmailTemplateActive("subscription_purchased"))) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  void sendSubscriptionPurchasedEmail({
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    planLabel: getPlanLabel(input.planId),
    amountLabel: formatStripeMoney(input.amountCents, input.currency),
  });
}

export async function notifySubscriptionRenewed(input: {
  businessId: string;
  planId: string;
  invoice: Stripe.Invoice;
}): Promise<void> {
  if (!(await isEmailTemplateActive("subscription_renewed"))) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  const periodStart = input.invoice.period_start
    ? new Date(input.invoice.period_start * 1000).toLocaleDateString("en-US")
    : null;
  const periodEnd = input.invoice.period_end
    ? new Date(input.invoice.period_end * 1000).toLocaleDateString("en-US")
    : null;

  void sendSubscriptionRenewedEmail({
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    planLabel: getPlanLabel(input.planId),
    amountLabel: formatStripeMoney(
      input.invoice.amount_paid,
      input.invoice.currency,
    ),
    billingPeriodLabel:
      periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : null,
  });
}

export async function notifySubscriptionPlanChanged(input: {
  businessId: string;
  previousPlanId: string;
  newPlanId: string;
}): Promise<void> {
  if (input.previousPlanId === input.newPlanId) {
    return;
  }

  if (!(await isEmailTemplateActive("subscription_plan_changed"))) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  void sendSubscriptionPlanChangedEmail({
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    planLabel: getPlanLabel(input.newPlanId),
    previousPlanLabel: getPlanLabel(input.previousPlanId),
  });
}

function formatPaymentMethodLabel(type: string): string {
  switch (type) {
    case "card":
      return "Card";
    case "us_bank_account":
      return "US bank account (ACH)";
    case "sepa_debit":
      return "SEPA Direct Debit";
    case "bacs_debit":
      return "BACS Direct Debit";
    case "acss_debit":
      return "Canadian pre-authorized debit";
    case "au_becs_debit":
      return "AU BECS Direct Debit";
    case "nz_bank_account":
      return "NZ bank account";
    default:
      return type.replace(/_/g, " ");
  }
}

export async function notifyInvoicePaymentFailed(input: {
  businessId: string;
  invoice: Stripe.Invoice;
  stripeEventId: string;
}): Promise<void> {
  const invoice = input.invoice;

  if (!isSubscriptionInvoice(invoice)) {
    return;
  }

  if ((invoice.attempt_count ?? 0) < 1) {
    return;
  }

  if ((invoice.amount_due ?? 0) <= 0) {
    return;
  }

  const paymentMethodType = await resolveInvoicePaymentMethodType(invoice);

  if (!paymentMethodType) {
    return;
  }

  const isCard = isCardPaymentMethodType(paymentMethodType);
  const isBank = isBankDebitPaymentMethodType(paymentMethodType);

  if (!isCard && !isBank) {
    return;
  }

  const templateId = isCard ? "payment_card_failed" : "payment_bank_failed";

  if (!(await isEmailTemplateActive(templateId))) {
    return;
  }

  const dedupeKey = `${templateId}:${invoice.id}:attempt:${invoice.attempt_count ?? 1}`;

  if (await hasBillingEmailBeenSent(dedupeKey)) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  const planId = (await getBusinessSubscriptionPlan(input.businessId)) ?? "starter";
  const failureMessage =
    invoice.last_finalization_error?.message ??
    invoice.last_finalization_error?.code ??
    null;

  const payload = {
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    planLabel: getPlanLabel(planId),
    amountLabel: formatStripeMoney(invoice.amount_due, invoice.currency),
    failureMessage,
    paymentMethodLabel: formatPaymentMethodLabel(paymentMethodType),
    dedupeKey,
    stripeEventId: input.stripeEventId,
  };

  if (isCard) {
    void sendPaymentCardFailedEmail(payload);
    return;
  }

  void sendPaymentBankFailedEmail(payload);
}

export async function notifyCardExpiringFromSource(input: {
  businessId: string;
  card: Stripe.Card;
  stripeEventId: string;
}): Promise<void> {
  if (!(await isEmailTemplateActive("card_expiring"))) {
    return;
  }

  if (!input.card.exp_month || !input.card.exp_year) {
    return;
  }

  const dedupeKey = `card_expiring:source:${input.card.id}:${input.card.exp_month}-${input.card.exp_year}`;

  if (await hasBillingEmailBeenSent(dedupeKey)) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  const planId = await getBusinessSubscriptionPlan(input.businessId);

  void sendCardExpiringEmail({
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    cardLabel: `${formatCardBrandLabel(input.card.brand)} •••• ${input.card.last4 ?? "****"}`,
    expiryLabel: formatCardExpiryLabel(
      input.card.exp_month,
      input.card.exp_year,
    ),
    planLabel: planId ? getPlanLabel(planId) : null,
    dedupeKey,
    stripeEventId: input.stripeEventId,
  });
}

export async function notifyCardExpiringFromUpcomingInvoice(input: {
  businessId: string;
  customerId: string;
  invoice: Stripe.Invoice;
  stripeEventId: string;
}): Promise<void> {
  if (!(await isEmailTemplateActive("card_expiring"))) {
    return;
  }

  const card = await resolveDefaultCardDetailsForCustomer(input.customerId);

  if (!card) {
    return;
  }

  const billingDate = input.invoice.next_payment_attempt
    ? new Date(input.invoice.next_payment_attempt * 1000)
    : input.invoice.period_end
      ? new Date(input.invoice.period_end * 1000)
      : null;

  if (!billingDate) {
    return;
  }

  if (
    !isCardExpiringBeforeDate({
      expMonth: card.expMonth,
      expYear: card.expYear,
      beforeDate: billingDate,
    })
  ) {
    return;
  }

  const dedupeKey = `card_expiring:pm:${card.paymentMethodId}:${card.expMonth}-${card.expYear}`;

  if (await hasBillingEmailBeenSent(dedupeKey)) {
    return;
  }

  const recipient = await resolveBusinessBillingRecipient(input.businessId);

  if (!recipient) {
    return;
  }

  const planId = await getBusinessSubscriptionPlan(input.businessId);

  void sendCardExpiringEmail({
    to: recipient.email,
    userId: recipient.userId,
    businessId: input.businessId,
    cardLabel: `${formatCardBrandLabel(card.brand)} •••• ${card.last4}`,
    expiryLabel: formatCardExpiryLabel(card.expMonth, card.expYear),
    planLabel: planId ? getPlanLabel(planId) : null,
    dedupeKey,
    stripeEventId: input.stripeEventId,
  });
}
