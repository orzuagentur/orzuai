import "server-only";

import {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_PLANS,
  resolveSubscriptionPlan,
} from "@/features/subscription/plans";
import { PASS_THROUGH_SERVICES, SUBSCRIPTION_ADD_ONS } from "@/features/subscription/add-ons";
import { hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getAiUsageSummaryForBusiness } from "@/services/ai-usage.service";
import { getUsageSnapshot } from "@/services/entitlement.service";
import type { SubscriptionPageData } from "@/types/subscription.types";

export async function getSubscriptionPageData(): Promise<SubscriptionPageData> {
  const emptyUsage = {
    usedAiReplies: 0,
    monthlyAiLimit: SUBSCRIPTION_PLANS.free.monthlyAiReplies,
    usedVoiceMinutes: 0,
    monthlyVoiceLimit: 0,
    connectedChannels: 0,
    maxChannels: SUBSCRIPTION_PLANS.free.entitlements.maxMessagingChannels,
    automationCount: 0,
    maxAutomations: 0,
  };

  const empty: SubscriptionPageData = {
    hasBusiness: false,
    stripeConfigured: hasStripeEnv(),
    currentPlanId: "free",
    currentPlanLabel: SUBSCRIPTION_PLANS.free.label,
    currentPlanTagline: SUBSCRIPTION_PLANS.free.tagline,
    subscriptionStatus: "active",
    hasStripeCustomer: false,
    plans: SUBSCRIPTION_PLAN_IDS.map((id) => ({
      id,
      label: SUBSCRIPTION_PLANS[id].label,
      tagline: SUBSCRIPTION_PLANS[id].tagline,
      priceMonthly: SUBSCRIPTION_PLANS[id].priceMonthly,
      monthlyAiReplies: SUBSCRIPTION_PLANS[id].monthlyAiReplies,
      features: [...SUBSCRIPTION_PLANS[id].features],
      highlighted: SUBSCRIPTION_PLANS[id].highlighted,
    })),
    usagePercent: 0,
    usedReplies: 0,
    monthlyLimit: SUBSCRIPTION_PLANS.free.monthlyAiReplies,
    usage: emptyUsage,
  };

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return empty;
  }

  const planId = resolveSubscriptionPlan(business.subscription_plan);
  const [usage, snapshot] = await Promise.all([
    getAiUsageSummaryForBusiness(business.id, planId),
    getUsageSnapshot(business.id),
  ]);

  return {
    hasBusiness: true,
    stripeConfigured: hasStripeEnv(),
    currentPlanId: planId,
    currentPlanLabel: SUBSCRIPTION_PLANS[planId].label,
    currentPlanTagline: SUBSCRIPTION_PLANS[planId].tagline,
    subscriptionStatus: business.subscription_status ?? "active",
    hasStripeCustomer: Boolean(business.stripe_customer_id),
    plans: SUBSCRIPTION_PLAN_IDS.map((id) => ({
      id,
      label: SUBSCRIPTION_PLANS[id].label,
      tagline: SUBSCRIPTION_PLANS[id].tagline,
      priceMonthly: SUBSCRIPTION_PLANS[id].priceMonthly,
      monthlyAiReplies: SUBSCRIPTION_PLANS[id].monthlyAiReplies,
      features: [...SUBSCRIPTION_PLANS[id].features],
      highlighted: SUBSCRIPTION_PLANS[id].highlighted,
    })),
    usagePercent: usage.usagePercent,
    usedReplies: usage.usedReplies,
    monthlyLimit: usage.monthlyLimit,
    usage: snapshot,
  };
}

export { SUBSCRIPTION_ADD_ONS, PASS_THROUGH_SERVICES };
