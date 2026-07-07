import "server-only";

import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe/client";

type StripeInvoiceWithRelations = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null;
  subscription?: string | Stripe.Subscription | null;
};

function asStripeInvoiceWithRelations(
  invoice: Stripe.Invoice,
): StripeInvoiceWithRelations {
  return invoice as StripeInvoiceWithRelations;
}

function readPaymentMethodType(
  paymentMethod: Stripe.PaymentMethod | string | null | undefined,
): string | null {
  if (!paymentMethod || typeof paymentMethod === "string") {
    return null;
  }

  return paymentMethod.type ?? null;
}

export async function resolveInvoicePaymentMethodType(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const stripe = getStripeClient();
  const normalized = asStripeInvoiceWithRelations(invoice);

  const paymentIntentId =
    typeof normalized.payment_intent === "string"
      ? normalized.payment_intent
      : normalized.payment_intent?.id;

  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method", "last_payment_error.payment_method"],
    });

    const paymentMethod =
      readPaymentMethodType(
        typeof paymentIntent.payment_method === "object"
          ? paymentIntent.payment_method
          : null,
      ) ??
      readPaymentMethodType(
        typeof paymentIntent.last_payment_error?.payment_method === "object"
          ? paymentIntent.last_payment_error.payment_method
          : null,
      );

    if (paymentMethod) {
      return paymentMethod;
    }
  }

  const subscriptionId =
    typeof normalized.subscription === "string"
      ? normalized.subscription
      : normalized.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"],
    });

    const defaultType = readPaymentMethodType(
      typeof subscription.default_payment_method === "object"
        ? subscription.default_payment_method
        : null,
    );

    if (defaultType) {
      return defaultType;
    }
  }

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });

    if (!customer.deleted) {
      const defaultType = readPaymentMethodType(
        typeof customer.invoice_settings?.default_payment_method === "object"
          ? customer.invoice_settings.default_payment_method
          : null,
      );

      if (defaultType) {
        return defaultType;
      }
    }
  }

  return null;
}

export async function resolveDefaultCardDetailsForCustomer(
  customerId: string,
): Promise<{
  paymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null> {
  const stripe = getStripeClient();
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (customer.deleted) {
    return null;
  }

  const paymentMethod = customer.invoice_settings?.default_payment_method;

  if (
    !paymentMethod ||
    typeof paymentMethod === "string" ||
    paymentMethod.type !== "card" ||
    !paymentMethod.card
  ) {
    return null;
  }

  return {
    paymentMethodId: paymentMethod.id,
    brand: paymentMethod.card.brand ?? "card",
    last4: paymentMethod.card.last4 ?? "****",
    expMonth: paymentMethod.card.exp_month,
    expYear: paymentMethod.card.exp_year,
  };
}
