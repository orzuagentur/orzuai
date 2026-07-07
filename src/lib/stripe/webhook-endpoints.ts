import type Stripe from "stripe";

export const STRIPE_BILLING_WEBHOOK_URL = "https://www.orzux.com/api/webhooks/stripe";

export const STRIPE_BILLING_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.created",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.source.expiring",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.upcoming",
] as const;

export type StripeWebhookSetupResult = {
  webhookId: string;
  webhookUrl: string;
  created: boolean;
  deletedEndpointIds: string[];
  webhookSecret: string | null;
};

export async function ensureStripeBillingWebhook(
  stripe: Stripe,
): Promise<StripeWebhookSetupResult> {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });

  const deletedEndpointIds: string[] = [];

  for (const endpoint of endpoints.data) {
    if (
      endpoint.url.includes("orzux.com/api/webhooks/stripe") &&
      endpoint.url !== STRIPE_BILLING_WEBHOOK_URL
    ) {
      await stripe.webhookEndpoints.del(endpoint.id);
      deletedEndpointIds.push(endpoint.id);
    }
  }

  let existing = endpoints.data.find(
    (endpoint) => endpoint.url === STRIPE_BILLING_WEBHOOK_URL,
  );

  if (existing) {
    existing = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: [...STRIPE_BILLING_WEBHOOK_EVENTS],
      disabled: false,
      description: "OrzuX production billing (www — no redirect)",
    });

    return {
      webhookId: existing.id,
      webhookUrl: STRIPE_BILLING_WEBHOOK_URL,
      created: false,
      deletedEndpointIds,
      webhookSecret: existing.secret ?? null,
    };
  }

  const created = await stripe.webhookEndpoints.create({
    url: STRIPE_BILLING_WEBHOOK_URL,
    enabled_events: [...STRIPE_BILLING_WEBHOOK_EVENTS],
    description: "OrzuX production billing (www — no redirect)",
  });

  return {
    webhookId: created.id,
    webhookUrl: STRIPE_BILLING_WEBHOOK_URL,
    created: true,
    deletedEndpointIds,
    webhookSecret: created.secret ?? null,
  };
}
