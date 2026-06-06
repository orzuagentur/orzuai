export const SUBSCRIPTION_PLAN_IDS = ["free", "starter", "pro", "agency"] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanId,
  {
    label: string;
    monthlyAiReplies: number;
    priceMonthly: number;
    features: string[];
    highlighted?: boolean;
  }
> = {
  free: {
    label: "Free Plan",
    monthlyAiReplies: 100,
    priceMonthly: 0,
    features: ["100 AI replies / month", "1 channel", "Basic CRM"],
  },
  starter: {
    label: "Starter",
    monthlyAiReplies: 500,
    priceMonthly: 29,
    features: ["500 AI replies / month", "3 channels", "CRM + pipeline"],
  },
  pro: {
    label: "Pro",
    monthlyAiReplies: 5000,
    priceMonthly: 99,
    highlighted: true,
    features: [
      "5,000 AI replies / month",
      "Voice agent",
      "Analytics + AI assistant",
    ],
  },
  agency: {
    label: "Agency",
    monthlyAiReplies: 50000,
    priceMonthly: 299,
    features: ["50,000 AI replies / month", "Multi-brand", "Priority support"],
  },
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
