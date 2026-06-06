import { ENV_KEYS } from "@/constants/env-keys";
import type { SubscriptionPlanId } from "@/features/subscription/plans";

export function getStripePriceIdForPlan(
  planId: SubscriptionPlanId,
): string | null {
  const map: Record<Exclude<SubscriptionPlanId, "free">, string | undefined> = {
    starter: process.env[ENV_KEYS.STRIPE_PRICE_STARTER]?.trim(),
    pro: process.env[ENV_KEYS.STRIPE_PRICE_PRO]?.trim(),
    agency: process.env[ENV_KEYS.STRIPE_PRICE_AGENCY]?.trim(),
  };

  if (planId === "free") {
    return null;
  }

  return map[planId] ?? null;
}

export function getPaidPlanIds(): Array<Exclude<SubscriptionPlanId, "free">> {
  return ["starter", "pro", "agency"];
}
