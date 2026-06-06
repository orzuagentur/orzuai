import type { SubscriptionPlanId } from "@/features/subscription/plans";

export type SubscriptionPlanCard = {
  id: SubscriptionPlanId;
  label: string;
  priceMonthly: number;
  monthlyAiReplies: number;
  features: string[];
  highlighted?: boolean;
};

export type SubscriptionPageData = {
  hasBusiness: boolean;
  stripeConfigured: boolean;
  currentPlanId: SubscriptionPlanId;
  currentPlanLabel: string;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
  plans: SubscriptionPlanCard[];
  usagePercent: number;
  usedReplies: number;
  monthlyLimit: number;
};
