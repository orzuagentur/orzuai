import type { SubscriptionPlanId } from "@/features/subscription/plans";
import {
  getStripePriceIdForPlanAsync,
  listPlatformPlans,
} from "@/services/platform-plans.service";

export async function getStripePriceIdForPlan(
  planId: SubscriptionPlanId,
): Promise<string | null> {
  return getStripePriceIdForPlanAsync(planId);
}

export async function getPaidPlanIds(): Promise<
  Array<Exclude<SubscriptionPlanId, "free">>
> {
  const plans = await listPlatformPlans({ activeOnly: true, publicOnly: true });

  return plans
    .filter((plan) => plan.id !== "free" && plan.priceMonthlyCents > 0)
    .map((plan) => plan.id as Exclude<SubscriptionPlanId, "free">);
}

/** @deprecated Env-only fallback kept for scripts */
export function getStripePriceIdForPlanFromEnv(
  planId: SubscriptionPlanId,
): string | null {
  const map: Record<Exclude<SubscriptionPlanId, "free">, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER?.trim(),
    pro: process.env.STRIPE_PRICE_PRO?.trim(),
    agency: process.env.STRIPE_PRICE_AGENCY?.trim(),
  };

  if (planId === "free") {
    return null;
  }

  return map[planId as Exclude<SubscriptionPlanId, "free">] ?? null;
}
