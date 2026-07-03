import type { SubscriptionPlanId } from "@/features/subscription/plans";

export type SubscriptionPlanCard = {
  id: SubscriptionPlanId;
  label: string;
  tagline: string;
  priceMonthly: number;
  monthlyAiReplies: number;
  features: string[];
  highlighted?: boolean;
};

export type SubscriptionUsageSnapshot = {
  usedAiReplies: number;
  monthlyAiLimit: number;
  usedVoiceMinutes: number;
  monthlyVoiceLimit: number;
  connectedChannels: number;
  maxChannels: number;
  automationCount: number;
  maxAutomations: number;
};

export type SubscriptionPageData = {
  hasBusiness: boolean;
  stripeConfigured: boolean;
  currentPlanId: SubscriptionPlanId;
  currentPlanLabel: string;
  currentPlanTagline: string;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
  plans: SubscriptionPlanCard[];
  usagePercent: number;
  usedReplies: number;
  monthlyLimit: number;
  usage: SubscriptionUsageSnapshot;
};
