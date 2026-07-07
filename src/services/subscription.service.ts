import "server-only";

import { PASS_THROUGH_SERVICES } from "@/features/subscription/add-ons";
import { SUBSCRIPTION_PLANS, resolveSubscriptionPlan } from "@/features/subscription/plans";
import { hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getAiUsageSummaryForBusiness } from "@/services/ai-usage.service";
import {
  getStripePaymentMethodForCustomer,
  listStripeInvoicesForBusiness,
  syncSubscriptionForCurrentBusiness,
} from "@/services/stripe.service";
import { getUsageSnapshot } from "@/services/entitlement.service";
import {
  getPlatformPlan,
  listPlatformAddons,
  listPlatformPlans,
  parseBusinessSubscriptionAddons,
} from "@/services/platform-plans.service";
import type { SubscriptionPageData } from "@/types/subscription.types";
import type { BillingInvoiceItem } from "@/types/billing.types";

const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);

function mapPlansToPageData(
  plans: Awaited<ReturnType<typeof listPlatformPlans>>,
): SubscriptionPageData["plans"] {
  return plans.map((plan) => ({
    id: plan.id,
    label: plan.label,
    tagline: plan.tagline,
    priceMonthly: plan.priceMonthly,
    monthlyAiReplies: plan.monthlyAiReplies,
    features: [...plan.features],
    highlighted: plan.highlighted,
  }));
}

function mapAddonsToPageData(
  addons: Awaited<ReturnType<typeof listPlatformAddons>>,
  activeAddons: ReturnType<typeof parseBusinessSubscriptionAddons>,
  hasActivePaidSubscription: boolean,
  stripeConfigured: boolean,
): SubscriptionPageData["addOns"] {
  return addons.map((addon) => {
    const active = activeAddons.find((entry) => entry.id === addon.id);

    return {
      id: addon.id,
      label: addon.label,
      description: addon.description,
      priceMonthly: addon.priceMonthly,
      activeQuantity: active?.quantity ?? 0,
      purchasable:
        stripeConfigured &&
        hasActivePaidSubscription &&
        Boolean(addon.stripePriceId) &&
        addon.priceMonthlyCents > 0,
    };
  });
}

export async function getSubscriptionPageData(): Promise<SubscriptionPageData> {
  const [publicPlans, publicAddons] = await Promise.all([
    listPlatformPlans({ activeOnly: true, publicOnly: true }),
    listPlatformAddons({ activeOnly: true }),
  ]);
  const freePlan =
    publicPlans.find((plan) => plan.id === "free") ??
    (await getPlatformPlan("free"));
  const freeEntitlements = freePlan?.entitlements ?? SUBSCRIPTION_PLANS.free.entitlements;

  const emptyUsage = {
    usedAiReplies: 0,
    monthlyAiLimit: freeEntitlements.monthlyAiReplies,
    usedVoiceMinutes: 0,
    monthlyVoiceLimit: 0,
    connectedChannels: 0,
    maxChannels: freeEntitlements.maxMessagingChannels,
    automationCount: 0,
    maxAutomations: 0,
  };

  const stripeConfigured = hasStripeEnv();

  const empty: SubscriptionPageData = {
    hasBusiness: false,
    stripeConfigured,
    currentPlanId: "free",
    currentPlanLabel: freePlan?.label ?? SUBSCRIPTION_PLANS.free.label,
    currentPlanTagline: freePlan?.tagline ?? SUBSCRIPTION_PLANS.free.tagline,
    subscriptionStatus: "active",
    hasStripeCustomer: false,
    hasActivePaidSubscription: false,
    plans: mapPlansToPageData(publicPlans),
    addOns: mapAddonsToPageData(publicAddons, [], false, stripeConfigured),
    usagePercent: 0,
    usedReplies: 0,
    monthlyLimit: freeEntitlements.monthlyAiReplies,
    usage: emptyUsage,
    paymentMethod: null,
    recentInvoices: [],
  };

  const user = await requireUser();
  let business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return empty;
  }

  if (
    stripeConfigured &&
    business.stripe_customer_id &&
    (!business.stripe_subscription_id ||
      (business.subscription_plan?.trim().toLowerCase() || "free") === "free")
  ) {
    await syncSubscriptionForCurrentBusiness();
    business = (await getPrimaryBusiness(user.id)) ?? business;
  }

  const storedPlanId = business.subscription_plan?.trim().toLowerCase() || "free";
  const planId = (await getPlatformPlan(storedPlanId))
    ? storedPlanId
    : resolveSubscriptionPlan(business.subscription_plan);
  const currentPlan = (await getPlatformPlan(planId)) ?? freePlan;
  const subscriptionStatus = business.subscription_status ?? "active";
  const hasActivePaidSubscription =
    planId !== "free" &&
    Boolean(business.stripe_subscription_id) &&
    ACTIVE_BILLING_STATUSES.has(subscriptionStatus.trim().toLowerCase());
  const activeAddons = parseBusinessSubscriptionAddons(business.subscription_addons);
  const [usage, snapshot, paymentMethod, recentInvoices] = await Promise.all([
    getAiUsageSummaryForBusiness(
      business.id,
      planId as Parameters<typeof getAiUsageSummaryForBusiness>[1],
    ),
    getUsageSnapshot(business.id),
    business.stripe_customer_id
      ? getStripePaymentMethodForCustomer(business.stripe_customer_id)
      : Promise.resolve(null),
    business.stripe_customer_id
      ? listStripeInvoicesForBusiness(
          business.id,
          business.stripe_customer_id,
          24,
        )
      : Promise.resolve([] as BillingInvoiceItem[]),
  ]);

  return {
    hasBusiness: true,
    stripeConfigured,
    currentPlanId: planId,
    currentPlanLabel: currentPlan?.label ?? planId,
    currentPlanTagline: currentPlan?.tagline ?? "",
    subscriptionStatus,
    hasStripeCustomer: Boolean(business.stripe_customer_id),
    hasActivePaidSubscription,
    plans: mapPlansToPageData(publicPlans),
    addOns: mapAddonsToPageData(
      publicAddons,
      activeAddons,
      hasActivePaidSubscription,
      stripeConfigured,
    ),
    usagePercent: usage.usagePercent,
    usedReplies: usage.usedReplies,
    monthlyLimit: usage.monthlyLimit,
    usage: snapshot,
    paymentMethod,
    recentInvoices,
  };
}

export { PASS_THROUGH_SERVICES };
