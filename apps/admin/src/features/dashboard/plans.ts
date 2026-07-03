import { SUBSCRIPTION_PLANS } from "@orzuai/features/subscription/plans";

import { loadAdminPlanPrices } from "@/features/billing/plans-service";

export {
  PLATFORM_PLANS,
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_PLANS,
  resolvePlanId,
  resolveSubscriptionPlan,
  type PlatformPlanId,
  type SubscriptionPlanId,
} from "@/features/dashboard/plan-catalog";

export async function loadPlatformPlansForAdmin() {
  try {
    return await loadAdminPlanPrices();
  } catch {
    return {
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
    };
  }
}
