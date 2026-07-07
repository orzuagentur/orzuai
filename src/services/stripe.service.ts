import "server-only";

import type Stripe from "stripe";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { SubscriptionPlanId } from "@/features/subscription/plans";
import { getStripePriceIdForPlanAsync, getStripePriceIdForAddonAsync, listPlatformAddons, listPlatformPlans, resolveAddonItemsFromStripePrices, resolvePlanIdFromStripePrice } from "@/services/platform-plans.service";
import { getAppUrl } from "@/lib/env";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getBusinessSubscriptionPlan,
  notifyCardExpiringFromSource,
  notifyCardExpiringFromUpcomingInvoice,
  notifyInvoicePaymentFailed,
  notifySubscriptionPlanChanged,
  notifySubscriptionPurchased,
  notifySubscriptionRenewed,
} from "@/services/billing-email.service";
import type { BusinessSubscriptionAddon } from "@/types/platform-plans.types";
import type {
  BillingInvoiceDetail,
  BillingInvoiceItem,
  BillingInvoiceLineItem,
  BillingPaymentMethod,
} from "@/types/billing.types";
import {
  quoteTwilioTopUp,
  recordTwilioTopUpPayment,
} from "@/services/twilio-wallet.service";

function planFromStripePrice(priceId: string | undefined): SubscriptionPlanId {
  // Sync fallback for webhook edge cases before async path runs.
  const starter = process.env.STRIPE_PRICE_STARTER?.trim();
  const pro = process.env.STRIPE_PRICE_PRO?.trim();
  const agency = process.env.STRIPE_PRICE_AGENCY?.trim();

  if (priceId && pro && priceId === pro) return "pro";
  if (priceId && agency && priceId === agency) return "agency";
  if (priceId && starter && priceId === starter) return "starter";

  return "free";
}

async function resolvePlanFromStripePrice(
  priceId: string | undefined,
): Promise<SubscriptionPlanId> {
  const fromDb = await resolvePlanIdFromStripePrice(priceId);

  if (fromDb !== "free" || !priceId) {
    return fromDb as SubscriptionPlanId;
  }

  return planFromStripePrice(priceId);
}

async function getOwnedBusiness() {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return null;
  }

  return { user, business };
}

export async function ensureStripeCustomer(input: {
  businessId: string;
  email: string;
  businessName: string;
}): Promise<string | null> {
  if (!hasStripeEnv() || !hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("stripe_customer_id")
    .eq("id", input.businessId)
    .maybeSingle();

  if (business?.stripe_customer_id) {
    return business.stripe_customer_id;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.businessName,
    metadata: { business_id: input.businessId },
  });

  await supabase
    .from("businesses")
    .update({ stripe_customer_id: customer.id })
    .eq("id", input.businessId);

  return customer.id;
}

export async function createCheckoutSession(
  planId: string,
): Promise<{ success: true; url: string } | { success: false; message: string }> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Stripe is not configured." };
  }

  if (planId === "free") {
    return { success: false, message: "Free plan does not require checkout." };
  }

  const priceId = await getStripePriceIdForPlanAsync(planId);

  if (!priceId) {
    return {
      success: false,
      message: `Stripe price ID missing for plan "${planId}".`,
    };
  }

  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  const customerId = await ensureStripeCustomer({
    businessId: owned.business.id,
    email: owned.user.email ?? "",
    businessName: owned.business.business_name,
  });

  if (!customerId) {
    return { success: false, message: "Unable to create Stripe customer." };
  }

  const stripe = getStripeClient();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${DASHBOARD_ROUTES.subscription}?checkout=success`,
    cancel_url: `${appUrl}${DASHBOARD_ROUTES.subscription}?checkout=canceled`,
    metadata: {
      business_id: owned.business.id,
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        business_id: owned.business.id,
        plan_id: planId,
      },
    },
  });

  if (!session.url) {
    return { success: false, message: "Stripe did not return a checkout URL." };
  }

  return { success: true, url: session.url };
}

export async function purchaseSubscriptionAddon(
  addonId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Stripe is not configured." };
  }

  const normalizedAddonId = addonId.trim().toLowerCase();

  if (!normalizedAddonId) {
    return { success: false, message: "Invalid add-on." };
  }

  const addon = (await listPlatformAddons({ activeOnly: true })).find(
    (entry) => entry.id === normalizedAddonId,
  );

  if (!addon) {
    return { success: false, message: "Add-on not found." };
  }

  const priceId = addon.stripePriceId ?? (await getStripePriceIdForAddonAsync(normalizedAddonId));

  if (!priceId) {
    return {
      success: false,
      message: `Stripe price missing for "${addon.label}". Sync add-ons in admin first.`,
    };
  }

  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  if (!owned.business.stripe_subscription_id) {
    return {
      success: false,
      message: "Upgrade to a paid plan before adding add-ons.",
    };
  }

  const billingStatus = owned.business.subscription_status?.trim().toLowerCase();

  if (billingStatus !== "active" && billingStatus !== "trialing") {
    return {
      success: false,
      message: "Your subscription must be active before adding add-ons.",
    };
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    owned.business.stripe_subscription_id,
  );

  const existingItem = subscription.items.data.find(
    (item) => item.price.id === priceId,
  );

  if (existingItem) {
    await stripe.subscriptionItems.update(existingItem.id, {
      quantity: (existingItem.quantity ?? 1) + 1,
      proration_behavior: "create_prorations",
    });
  } else {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: priceId,
      quantity: 1,
      proration_behavior: "create_prorations",
    });
  }

  await syncBusinessFromStripeSubscription(owned.business.id, subscription.id);

  return { success: true };
}

export async function createBillingPortalSession(): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Stripe is not configured." };
  }

  const owned = await getOwnedBusiness();

  if (!owned?.business.stripe_customer_id) {
    return {
      success: false,
      message: "No payment method on file. Upgrade to a paid plan first.",
    };
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: owned.business.stripe_customer_id,
    return_url: `${getAppUrl()}${DASHBOARD_ROUTES.subscription}`,
  });

  return { success: true, url: session.url };
}

function mapStripePaymentMethod(
  paymentMethod: Stripe.PaymentMethod,
): BillingPaymentMethod {
  const card = paymentMethod.card;

  return {
    id: paymentMethod.id,
    brand: card?.brand ?? "card",
    last4: card?.last4 ?? "????",
    expMonth: card?.exp_month ?? 0,
    expYear: card?.exp_year ?? 0,
  };
}

function mapStripeInvoice(invoice: Stripe.Invoice): BillingInvoiceItem {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status ?? "unknown",
    amountDueCents: invoice.amount_due ?? 0,
    amountPaidCents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "usd",
    createdAt: new Date((invoice.created ?? 0) * 1000).toISOString(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
  };
}

export async function getStripePaymentMethodForCustomer(
  customerId: string,
): Promise<BillingPaymentMethod | null> {
  if (!hasStripeEnv()) {
    return null;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (customer.deleted) {
    return null;
  }

  const defaultPaymentMethod =
    customer.invoice_settings?.default_payment_method;

  if (defaultPaymentMethod && typeof defaultPaymentMethod !== "string") {
    return mapStripePaymentMethod(defaultPaymentMethod);
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  const first = paymentMethods.data[0];

  return first ? mapStripePaymentMethod(first) : null;
}

export async function listStripeInvoicesForCustomer(
  customerId: string,
  limit = 8,
): Promise<BillingInvoiceItem[]> {
  if (!hasStripeEnv()) {
    return [];
  }

  const stripe = getStripeClient();
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data.map(mapStripeInvoice);
}

async function resolveBusinessIdFromStripeCustomer(
  customerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

function mapStripeInvoiceLine(invoice: Stripe.Invoice): BillingInvoiceLineItem[] {
  return (invoice.lines?.data ?? []).map((line) => ({
    id: line.id,
    description: line.description ?? "Subscription charge",
    amountCents: line.amount ?? 0,
    quantity: line.quantity ?? 1,
    periodStart: line.period?.start
      ? new Date(line.period.start * 1000).toISOString()
      : null,
    periodEnd: line.period?.end
      ? new Date(line.period.end * 1000).toISOString()
      : null,
  }));
}

function mapStripeInvoiceDetail(invoice: Stripe.Invoice): BillingInvoiceDetail {
  return {
    ...mapStripeInvoice(invoice),
    lineItems: mapStripeInvoiceLine(invoice),
    subtotalCents: invoice.subtotal ?? 0,
    taxCents: 0,
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
  };
}

async function cacheBillingInvoice(
  businessId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const admin = createAdminClient();

  await admin.from("billing_invoices").upsert({
    id: invoice.id,
    business_id: businessId,
    stripe_customer_id:
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
    number: invoice.number,
    status: invoice.status ?? "unknown",
    amount_due_cents: invoice.amount_due ?? 0,
    amount_paid_cents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "usd",
    line_items: mapStripeInvoiceLine(invoice),
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    pdf_url: invoice.invoice_pdf ?? null,
    created_at: new Date((invoice.created ?? 0) * 1000).toISOString(),
    synced_at: new Date().toISOString(),
  });
}

async function findActiveStripeSubscriptionForCustomer(
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return (
    subscriptions.data.find(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trialing",
    ) ?? null
  );
}

async function resolveStripeSubscriptionIdForBusiness(input: {
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  businessId: string;
}): Promise<string | null> {
  if (input.stripeSubscriptionId) {
    return input.stripeSubscriptionId;
  }

  if (input.stripeCustomerId) {
    const subscription = await findActiveStripeSubscriptionForCustomer(
      input.stripeCustomerId,
    );

    if (subscription) {
      return subscription.id;
    }
  }

  if (!hasStripeEnv()) {
    return null;
  }

  const stripe = getStripeClient();
  const searchResult = await stripe.subscriptions.search({
    query: `metadata['business_id']:'${input.businessId}' AND (status:'active' OR status:'trialing')`,
    limit: 1,
  });

  return searchResult.data[0]?.id ?? null;
}

export async function syncSubscriptionForCurrentBusiness(): Promise<
  | { success: true; planId: string; status: string }
  | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Billing is not configured." };
  }

  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  const customerId =
    owned.business.stripe_customer_id ??
    (await ensureStripeCustomer({
      businessId: owned.business.id,
      email: owned.user.email ?? "",
      businessName: owned.business.business_name,
    }));

  const subscriptionId = await resolveStripeSubscriptionIdForBusiness({
    stripeSubscriptionId: owned.business.stripe_subscription_id,
    stripeCustomerId: customerId,
    businessId: owned.business.id,
  });

  if (!subscriptionId) {
    return {
      success: true,
      planId: owned.business.subscription_plan ?? "free",
      status: owned.business.subscription_status ?? "active",
    };
  }

  await syncBusinessFromStripeSubscription(owned.business.id, subscriptionId);

  const admin = createAdminClient();
  const { data: refreshed } = await admin
    .from("businesses")
    .select("subscription_plan, subscription_status")
    .eq("id", owned.business.id)
    .maybeSingle();

  return {
    success: true,
    planId: (refreshed?.subscription_plan as string) ?? "free",
    status: (refreshed?.subscription_status as string) ?? "active",
  };
}

export async function changeSubscriptionPlan(
  planId: string,
): Promise<
  | { success: true; immediate: boolean; url?: string }
  | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Billing is not configured." };
  }

  const normalizedPlanId = planId.trim().toLowerCase();

  if (!normalizedPlanId) {
    return { success: false, message: "Invalid plan." };
  }

  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  if (normalizedPlanId === "free") {
    if (!owned.business.stripe_subscription_id) {
      await syncBusinessSubscription({
        businessId: owned.business.id,
        planId: "free",
        subscriptionStatus: "active",
        addons: [],
      });
      return { success: true, immediate: true };
    }

    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(owned.business.stripe_subscription_id);

    await syncBusinessSubscription({
      businessId: owned.business.id,
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      planId: "free",
      addons: [],
    });

    return { success: true, immediate: true };
  }

  const priceId = await getStripePriceIdForPlanAsync(normalizedPlanId);

  if (!priceId) {
    return {
      success: false,
      message: `Price not configured for plan "${normalizedPlanId}".`,
    };
  }

  if (!owned.business.stripe_subscription_id) {
    const checkout = await createCheckoutSession(normalizedPlanId);

    if (!checkout.success) {
      return checkout;
    }

    return { success: true, immediate: false, url: checkout.url };
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    owned.business.stripe_subscription_id,
  );
  const plans = await listPlatformPlans({ force: true });
  const planPriceIds = new Set(
    plans
      .filter((plan) => plan.stripePriceId)
      .map((plan) => plan.stripePriceId as string),
  );

  const planItem = subscription.items.data.find(
    (item) =>
      item.metadata?.type !== "twilio_phone_number" &&
      planPriceIds.has(item.price.id),
  );

  if (planItem) {
    await stripe.subscriptionItems.update(planItem.id, {
      price: priceId,
      quantity: 1,
      proration_behavior: "create_prorations",
    });
  } else {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: priceId,
      quantity: 1,
      proration_behavior: "create_prorations",
    });
  }

  await stripe.subscriptions.update(subscription.id, {
    metadata: {
      business_id: owned.business.id,
      plan_id: normalizedPlanId,
    },
    proration_behavior: "create_prorations",
  });

  await syncBusinessFromStripeSubscription(owned.business.id, subscription.id);

  return { success: true, immediate: true };
}

export async function createPaymentMethodSetupSession(): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Billing is not configured." };
  }

  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  const customerId = await ensureStripeCustomer({
    businessId: owned.business.id,
    email: owned.user.email ?? "",
    businessName: owned.business.business_name,
  });

  if (!customerId) {
    return { success: false, message: "Unable to prepare payment method update." };
  }

  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const returnUrl = `${appUrl}${DASHBOARD_ROUTES.subscription}?payment=updated`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      flow_data: {
        type: "payment_method_update",
        after_completion: {
          type: "redirect",
          redirect: { return_url: returnUrl },
        },
      },
    });

    if (portalSession.url) {
      return { success: true, url: portalSession.url };
    }
  } catch {
    // Fall back to Checkout setup when the billing portal flow is not configured.
  }

  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: returnUrl,
    cancel_url: `${appUrl}${DASHBOARD_ROUTES.subscription}`,
    metadata: {
      business_id: owned.business.id,
      type: "payment_method_update",
    },
    setup_intent_data: {
      metadata: {
        business_id: owned.business.id,
      },
    },
  });

  if (!session.url) {
    return { success: false, message: "Unable to start payment method update." };
  }

  return { success: true, url: session.url };
}

export async function createTwilioTopUpSession(
  creditCents: number,
): Promise<{ success: true; url: string } | { success: false; message: string }> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Billing is not configured." };
  }

  if (creditCents < 500) {
    return { success: false, message: "Minimum top-up is $5." };
  }

  const quote = quoteTwilioTopUp(creditCents);
  const owned = await getOwnedBusiness();

  if (!owned) {
    return { success: false, message: "Business not found." };
  }

  const customerId = await ensureStripeCustomer({
    businessId: owned.business.id,
    email: owned.user.email ?? "",
    businessName: owned.business.business_name,
  });

  if (!customerId) {
    return { success: false, message: "Unable to prepare payment." };
  }

  const stripe = getStripeClient();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Twilio usage balance",
            description: `$${(quote.creditCents / 100).toFixed(2)} credited for voice and SMS usage`,
          },
          unit_amount: quote.creditCents,
        },
        quantity: 1,
      },
      ...(quote.feeCents > 0
        ? [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Processing fee",
                  description: `${quote.feePercent}% payment processing`,
                },
                unit_amount: quote.feeCents,
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    success_url: `${appUrl}${DASHBOARD_ROUTES.subscriptionTwilio}?topup=success`,
    cancel_url: `${appUrl}${DASHBOARD_ROUTES.subscriptionTwilio}?topup=canceled`,
    metadata: {
      business_id: owned.business.id,
      type: "twilio_topup",
      credit_cents: String(quote.creditCents),
      fee_cents: String(quote.feeCents),
      charged_cents: String(quote.chargedCents),
    },
  });

  if (!session.url) {
    return { success: false, message: "Unable to start top-up checkout." };
  }

  return { success: true, url: session.url };
}

export async function getStripeInvoiceDetail(
  invoiceId: string,
): Promise<BillingInvoiceDetail | null> {
  if (!hasStripeEnv()) {
    return null;
  }

  const owned = await getOwnedBusiness();

  if (!owned?.business.stripe_customer_id) {
    return null;
  }

  const stripe = getStripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["lines.data"],
  });

  if (invoice.customer !== owned.business.stripe_customer_id) {
    return null;
  }

  return mapStripeInvoiceDetail(invoice);
}

export async function listStripeInvoicesForBusiness(
  businessId: string,
  customerId: string,
  limit = 24,
): Promise<BillingInvoiceItem[]> {
  const live = await listStripeInvoicesForCustomer(customerId, limit);

  if (live.length > 0 && hasSupabaseEnv()) {
    const stripe = getStripeClient();

    for (const item of live.slice(0, limit)) {
      try {
        const invoice = await stripe.invoices.retrieve(item.id, {
          expand: ["lines.data"],
        });
        await cacheBillingInvoice(businessId, invoice);
      } catch {
        // Keep live list even if cache fails.
      }
    }
  }

  return live;
}

export async function addTwilioNumberToStripeSubscription(input: {
  businessId: string;
  stripeSubscriptionId: string;
  phoneNumber: string;
  phoneSid: string;
  countryCode: string;
  monthlyPriceCents: number;
}): Promise<
  { success: true; subscriptionItemId: string } | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "Stripe is not configured." };
  }

  const stripe = getStripeClient();
  const countryLabel = input.countryCode.toUpperCase();
  const productId = process.env.STRIPE_PRODUCT_TWILIO_NUMBER?.trim();

  if (!productId) {
    return {
      success: false,
      message:
        "Twilio number billing is not configured (STRIPE_PRODUCT_TWILIO_NUMBER).",
    };
  }

  try {
    const item = await stripe.subscriptionItems.create({
      subscription: input.stripeSubscriptionId,
      price_data: {
        currency: "usd",
        product: productId,
        unit_amount: input.monthlyPriceCents,
        recurring: { interval: "month" },
      },
      quantity: 1,
      metadata: {
        type: "twilio_phone_number",
        business_id: input.businessId,
        phone_number: input.phoneNumber,
        phone_sid: input.phoneSid,
        country_code: countryLabel,
      },
      proration_behavior: "create_prorations",
    });

    return { success: true, subscriptionItemId: item.id };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to add phone number to subscription.",
    };
  }
}

export async function removeTwilioNumberFromStripeSubscription(
  subscriptionItemId: string,
): Promise<{ success: boolean; message?: string }> {
  if (!hasStripeEnv() || !subscriptionItemId.trim()) {
    return { success: true };
  }

  const stripe = getStripeClient();

  try {
    await stripe.subscriptionItems.del(subscriptionItemId, {
      proration_behavior: "create_prorations",
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to remove phone number from subscription.",
    };
  }
}

function resolvePlanIdFromStripeItem(
  item: Stripe.SubscriptionItem,
  plans: Awaited<ReturnType<typeof listPlatformPlans>>,
): string | null {
  const priceId = item.price.id;
  const matchedPlan = plans.find((plan) => plan.stripePriceId === priceId);

  if (matchedPlan && matchedPlan.id !== "free") {
    return matchedPlan.id;
  }

  const priceMetadata =
    typeof item.price === "object" && item.price.metadata
      ? item.price.metadata.plan_id?.trim().toLowerCase()
      : null;

  if (priceMetadata && priceMetadata !== "free") {
    return priceMetadata;
  }

  return null;
}

async function resolveSubscriptionFromStripeItems(
  items: Stripe.SubscriptionItem[],
  subscriptionMetadata?: Stripe.Metadata | null,
): Promise<{ planId: string; addons: BusinessSubscriptionAddon[] }> {
  const plans = await listPlatformPlans({ force: true });
  const planPriceIds = new Set(
    plans.filter((plan) => plan.stripePriceId).map((plan) => plan.stripePriceId as string),
  );

  let planId = "free";
  const addonPriceIds: string[] = [];

  for (const item of items) {
    if (item.metadata?.type === "twilio_phone_number") {
      continue;
    }

    const priceId = item.price.id;
    const quantity = item.quantity ?? 1;
    const matchedPlanId = resolvePlanIdFromStripeItem(item, plans);

    if (matchedPlanId) {
      planId = matchedPlanId;
      continue;
    }

    if (planPriceIds.has(priceId)) {
      continue;
    }

    for (let index = 0; index < quantity; index += 1) {
      addonPriceIds.push(priceId);
    }
  }

  if (planId === "free") {
    const metadataPlanId = subscriptionMetadata?.plan_id?.trim().toLowerCase();

    if (metadataPlanId && metadataPlanId !== "free") {
      planId = metadataPlanId;
    } else if (items[0]?.price.id) {
      planId = await resolvePlanFromStripePrice(items[0].price.id);
    }
  }

  const addons = await resolveAddonItemsFromStripePrices(addonPriceIds);

  return { planId, addons };
}

async function syncBusinessSubscription(input: {
  businessId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string;
  planId?: string;
  addons?: BusinessSubscriptionAddon[];
}) {
  const admin = createAdminClient();

  await admin
    .from("businesses")
    .update({
      stripe_customer_id: input.stripeCustomerId ?? undefined,
      stripe_subscription_id: input.stripeSubscriptionId ?? undefined,
      subscription_status: input.subscriptionStatus ?? undefined,
      subscription_plan: input.planId ?? undefined,
      subscription_addons: input.addons ?? undefined,
    })
    .eq("id", input.businessId);
}

async function syncBusinessFromStripeSubscription(
  businessId: string,
  subscriptionId: string,
): Promise<void> {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const { planId, addons } = await resolveSubscriptionFromStripeItems(
    subscription.items.data,
    subscription.metadata,
  );

  await syncBusinessSubscription({
    businessId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planId: subscription.status === "canceled" ? "free" : planId,
    addons: subscription.status === "canceled" ? [] : addons,
  });
}

async function applySetupIntentDefaultPaymentMethod(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const stripe = getStripeClient();
  const setupIntentId =
    typeof session.setup_intent === "string"
      ? session.setup_intent
      : session.setup_intent?.id;

  if (!setupIntentId) {
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!paymentMethodId || !customerId) {
    return;
  }

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    let businessId = session.metadata?.business_id ?? null;
    const metadataPlanId = session.metadata?.plan_id?.trim().toLowerCase();
    const subscriptionId = session.subscription as string | null;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (!businessId && customerId) {
      businessId = await resolveBusinessIdFromStripeCustomer(customerId);
    }

    if (businessId) {
      if (session.mode === "setup") {
        await applySetupIntentDefaultPaymentMethod(session);

        if (customerId) {
          await syncBusinessSubscription({
            businessId,
            stripeCustomerId: customerId,
          });
        }

        return;
      }

      if (subscriptionId) {
        await syncBusinessFromStripeSubscription(businessId, subscriptionId);

        if (metadataPlanId && metadataPlanId !== "free") {
          const admin = createAdminClient();
          await admin
            .from("businesses")
            .update({ subscription_plan: metadataPlanId })
            .eq("id", businessId);
        }

        const resolvedPlanId =
          metadataPlanId && metadataPlanId !== "free"
            ? metadataPlanId
            : (await getBusinessSubscriptionPlan(businessId)) ?? "starter";

        void notifySubscriptionPurchased({
          businessId,
          planId: resolvedPlanId,
          amountCents: session.amount_total ?? null,
          currency: session.currency ?? null,
        });
      } else if (session.mode === "payment" && session.metadata?.type === "twilio_topup") {
        const creditCents = Number.parseInt(
          session.metadata.credit_cents ??
            session.metadata.amount_cents ??
            "0",
          10,
        );
        const feeCents = Number.parseInt(session.metadata.fee_cents ?? "0", 10);
        const chargedCents = Number.parseInt(
          session.metadata.charged_cents ?? String(session.amount_total ?? 0),
          10,
        );
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : "";

        if (creditCents > 0 && paymentIntentId) {
          const topUpResult = await recordTwilioTopUpPayment({
            businessId,
            creditCents,
            feeCents,
            chargedCents:
              chargedCents > 0 ? chargedCents : session.amount_total ?? creditCents,
            stripePaymentIntentId: paymentIntentId,
          });

          if (!topUpResult.success) {
            console.error(
              "[stripe] twilio top-up credit failed",
              JSON.stringify({
                businessId,
                paymentIntentId,
                message: topUpResult.message,
              }),
            );
          }
        }
      } else if (customerId) {
        await syncBusinessSubscription({
          businessId,
          stripeCustomerId: customerId,
        });
      }
    }

    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    let businessId = subscription.metadata?.business_id ?? null;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (!businessId && customerId) {
      businessId = await resolveBusinessIdFromStripeCustomer(customerId);
    }

    const { planId, addons } = await resolveSubscriptionFromStripeItems(
      subscription.items.data,
      subscription.metadata,
    );
    const metadataPlanId = subscription.metadata?.plan_id?.trim().toLowerCase();
    const resolvedPlanId =
      planId !== "free"
        ? planId
        : metadataPlanId && metadataPlanId !== "free"
          ? metadataPlanId
          : planId;
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : subscription.status;

    let previousPlanId: string | null = null;

    if (businessId && event.type === "customer.subscription.updated") {
      previousPlanId = await getBusinessSubscriptionPlan(businessId);
    }

    if (businessId) {
      await syncBusinessSubscription({
        businessId,
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId:
          event.type === "customer.subscription.deleted" ? null : subscription.id,
        subscriptionStatus: status,
        planId: status === "canceled" ? "free" : resolvedPlanId,
        addons: status === "canceled" ? [] : addons,
      });

      if (
        event.type === "customer.subscription.updated" &&
        previousPlanId &&
        status !== "canceled" &&
        previousPlanId !== resolvedPlanId
      ) {
        void notifySubscriptionPlanChanged({
          businessId,
          previousPlanId,
          newPlanId: resolvedPlanId,
        });
      }
    }

    return;
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason !== "subscription_cycle") {
      return;
    }

    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      return;
    }

    const businessId = await resolveBusinessIdFromStripeCustomer(customerId);

    if (businessId) {
      await cacheBillingInvoice(businessId, invoice);

      const planId = (await getBusinessSubscriptionPlan(businessId)) ?? "starter";

      void notifySubscriptionRenewed({
        businessId,
        planId,
        invoice,
      });
    }

    return;
  }

  if (event.type === "invoice.finalized") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      return;
    }

    const businessId = await resolveBusinessIdFromStripeCustomer(customerId);

    if (businessId) {
      await cacheBillingInvoice(businessId, invoice);
    }

    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!customerId) {
      return;
    }

    const businessId = await resolveBusinessIdFromStripeCustomer(customerId);

    if (businessId) {
      await cacheBillingInvoice(businessId, invoice);
      void notifyInvoicePaymentFailed({
        businessId,
        invoice,
        stripeEventId: event.id,
      });
    }

    return;
  }

  if (event.type === "invoice.upcoming") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!customerId || invoice.billing_reason !== "subscription_cycle") {
      return;
    }

    const businessId = await resolveBusinessIdFromStripeCustomer(customerId);

    if (businessId) {
      void notifyCardExpiringFromUpcomingInvoice({
        businessId,
        customerId,
        invoice,
        stripeEventId: event.id,
      });
    }

    return;
  }

  if (event.type === "customer.source.expiring") {
    const card = event.data.object as Stripe.Card;
    const customerId =
      typeof card.customer === "string" ? card.customer : card.customer?.id;

    if (!customerId) {
      return;
    }

    const businessId = await resolveBusinessIdFromStripeCustomer(customerId);

    if (businessId) {
      void notifyCardExpiringFromSource({
        businessId,
        card,
        stripeEventId: event.id,
      });
    }

    return;
  }
}
