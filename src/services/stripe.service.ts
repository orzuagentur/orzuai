import "server-only";

import type Stripe from "stripe";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getStripePriceIdForPlanAsync, getStripePriceIdForAddonAsync, listPlatformAddons, listPlatformPlans, resolveAddonItemsFromStripePrices, resolvePlanIdFromStripePrice } from "@/services/platform-plans.service";
import {
  resolveSubscriptionPlan,
  type SubscriptionPlanId,
} from "@/features/subscription/plans";
import { getAppUrl } from "@/lib/env";
import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { BusinessSubscriptionAddon } from "@/types/platform-plans.types";

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

async function resolveSubscriptionFromStripeItems(
  items: Stripe.SubscriptionItem[],
): Promise<{ planId: string; addons: BusinessSubscriptionAddon[] }> {
  const plans = await listPlatformPlans({ force: true });
  const planPriceIds = new Set(
    plans.filter((plan) => plan.stripePriceId).map((plan) => plan.stripePriceId as string),
  );

  let planId = "free";
  const addonPriceIds: string[] = [];

  for (const item of items) {
    const priceId = item.price.id;
    const quantity = item.quantity ?? 1;

    if (planPriceIds.has(priceId)) {
      const matchedPlan = plans.find((plan) => plan.stripePriceId === priceId);

      if (matchedPlan && matchedPlan.id !== "free") {
        planId = matchedPlan.id;
      }

      continue;
    }

    for (let index = 0; index < quantity; index += 1) {
      addonPriceIds.push(priceId);
    }
  }

  if (planId === "free" && items[0]?.price.id) {
    planId = await resolvePlanFromStripePrice(items[0].price.id);
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
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const { planId, addons } = await resolveSubscriptionFromStripeItems(
    subscription.items.data,
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

export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.business_id;
    const planId = resolveSubscriptionPlan(session.metadata?.plan_id);
    const subscriptionId = session.subscription as string | null;

    if (businessId) {
      if (subscriptionId) {
        await syncBusinessFromStripeSubscription(businessId, subscriptionId);
      } else {
        await syncBusinessSubscription({
          businessId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: null,
          subscriptionStatus: "active",
          planId,
          addons: [],
        });
      }
    }

    return;
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const businessId = subscription.metadata?.business_id;
    const { planId, addons } = await resolveSubscriptionFromStripeItems(
      subscription.items.data,
    );
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : subscription.status;

    if (businessId) {
      await syncBusinessSubscription({
        businessId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        planId: status === "canceled" ? "free" : planId,
        addons: status === "canceled" ? [] : addons,
      });
    }
  }
}
