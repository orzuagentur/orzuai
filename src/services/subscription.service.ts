import "server-only";

import {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_PLANS,
  resolveSubscriptionPlan,
} from "@/features/subscription/plans";
import { hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getAiUsageSummaryForBusiness } from "@/services/ai-usage.service";
import type { SubscriptionPageData } from "@/types/subscription.types";

export async function getSubscriptionPageData(): Promise<SubscriptionPageData> {
  const empty: SubscriptionPageData = {
    hasBusiness: false,
    stripeConfigured: hasStripeEnv(),
    currentPlanId: "free",
    currentPlanLabel: SUBSCRIPTION_PLANS.free.label,
    subscriptionStatus: "active",
    hasStripeCustomer: false,
    plans: SUBSCRIPTION_PLAN_IDS.map((id) => ({
      id,
      label: SUBSCRIPTION_PLANS[id].label,
      priceMonthly: SUBSCRIPTION_PLANS[id].priceMonthly,
      monthlyAiReplies: SUBSCRIPTION_PLANS[id].monthlyAiReplies,
      features: [...SUBSCRIPTION_PLANS[id].features],
      highlighted: SUBSCRIPTION_PLANS[id].highlighted,
    })),
    usagePercent: 0,
    usedReplies: 0,
    monthlyLimit: SUBSCRIPTION_PLANS.free.monthlyAiReplies,
  };

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return empty;
  }

  const planId = resolveSubscriptionPlan(business.subscription_plan);
  const usage = await getAiUsageSummaryForBusiness(business.id, planId);

  return {
    hasBusiness: true,
    stripeConfigured: hasStripeEnv(),
    currentPlanId: planId,
    currentPlanLabel: SUBSCRIPTION_PLANS[planId].label,
    subscriptionStatus: business.subscription_status ?? "active",
    hasStripeCustomer: Boolean(business.stripe_customer_id),
    plans: SUBSCRIPTION_PLAN_IDS.map((id) => ({
      id,
      label: SUBSCRIPTION_PLANS[id].label,
      priceMonthly: SUBSCRIPTION_PLANS[id].priceMonthly,
      monthlyAiReplies: SUBSCRIPTION_PLANS[id].monthlyAiReplies,
      features: [...SUBSCRIPTION_PLANS[id].features],
      highlighted: SUBSCRIPTION_PLANS[id].highlighted,
    })),
    usagePercent: usage.usagePercent,
    usedReplies: usage.usedReplies,
    monthlyLimit: usage.monthlyLimit,
  };
}
