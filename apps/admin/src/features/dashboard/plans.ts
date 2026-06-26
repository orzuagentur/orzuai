export const PLATFORM_PLANS = {
  free: { label: "Free", priceMonthly: 0 },
  starter: { label: "Starter", priceMonthly: 29 },
  pro: { label: "Pro", priceMonthly: 99 },
  agency: { label: "Agency", priceMonthly: 299 },
} as const;

export type PlatformPlanId = keyof typeof PLATFORM_PLANS;

export function resolvePlanId(plan: string | null | undefined): PlatformPlanId {
  const normalized = plan?.trim().toLowerCase();

  if (normalized && normalized in PLATFORM_PLANS) {
    return normalized as PlatformPlanId;
  }

  return "free";
}
