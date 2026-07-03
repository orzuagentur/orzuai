export {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_PLANS,
  resolveSubscriptionPlan,
  type SubscriptionPlanId,
} from "@orzuai/features/subscription/plans";

import { SUBSCRIPTION_PLANS } from "@orzuai/features/subscription/plans";

export const PLATFORM_PLANS = {
  free: {
    label: SUBSCRIPTION_PLANS.free.label,
    priceMonthly: SUBSCRIPTION_PLANS.free.priceMonthly,
  },
  starter: {
    label: SUBSCRIPTION_PLANS.starter.label,
    priceMonthly: SUBSCRIPTION_PLANS.starter.priceMonthly,
  },
  pro: {
    label: SUBSCRIPTION_PLANS.pro.label,
    priceMonthly: SUBSCRIPTION_PLANS.pro.priceMonthly,
  },
  agency: {
    label: SUBSCRIPTION_PLANS.agency.label,
    priceMonthly: SUBSCRIPTION_PLANS.agency.priceMonthly,
  },
} as const;

export type PlatformPlanId = keyof typeof PLATFORM_PLANS;

export function resolvePlanId(plan: string | null | undefined): PlatformPlanId {
  const normalized = plan?.trim().toLowerCase();

  if (normalized && normalized in PLATFORM_PLANS) {
    return normalized as PlatformPlanId;
  }

  return "free";
}
