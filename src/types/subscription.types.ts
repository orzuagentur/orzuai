import type {
  BillingInvoiceItem,
  BillingPaymentMethod,
} from "@/types/billing.types";

export type SubscriptionPlanCard = {
  id: string;
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

export type SubscriptionAddOnCard = {
  id: string;
  label: string;
  description: string;
  priceMonthly: number;
  activeQuantity: number;
  purchasable: boolean;
};

export type SubscriptionPageData = {
  hasBusiness: boolean;
  stripeConfigured: boolean;
  currentPlanId: string;
  currentPlanLabel: string;
  currentPlanTagline: string;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
  hasActivePaidSubscription: boolean;
  plans: SubscriptionPlanCard[];
  addOns: SubscriptionAddOnCard[];
  usagePercent: number;
  usedReplies: number;
  monthlyLimit: number;
  usage: SubscriptionUsageSnapshot;
  paymentMethod: BillingPaymentMethod | null;
  recentInvoices: BillingInvoiceItem[];
};
