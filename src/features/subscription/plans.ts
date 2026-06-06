export const SUBSCRIPTION_PLAN_IDS = ["free", "starter", "pro", "agency"] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanId,
  { label: string; monthlyAiReplies: number }
> = {
  free: { label: "Free Plan", monthlyAiReplies: 100 },
  starter: { label: "Starter", monthlyAiReplies: 500 },
  pro: { label: "Pro", monthlyAiReplies: 5000 },
  agency: { label: "Agency", monthlyAiReplies: 50000 },
};

export function resolveSubscriptionPlan(
  plan: string | null | undefined,
): SubscriptionPlanId {
  const normalized = plan?.trim().toLowerCase();

  if (
    normalized &&
    (SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(normalized)
  ) {
    return normalized as SubscriptionPlanId;
  }

  return "free";
}
