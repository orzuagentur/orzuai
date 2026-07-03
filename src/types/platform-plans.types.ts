import type { PlanEntitlements } from "../features/subscription/entitlements";

export type PlatformSubscriptionPlanRow = {
  id: string;
  label: string;
  tagline: string;
  price_monthly_cents: number;
  sort_order: number;
  is_active: boolean;
  is_public: boolean;
  highlighted: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  entitlements: PlanEntitlements;
  features: string[];
  created_at: string;
  updated_at: string;
};

export type PlatformSubscriptionAddonRow = {
  id: string;
  label: string;
  description: string;
  price_monthly_cents: number;
  sort_order: number;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PlatformPlanRecord = {
  id: string;
  label: string;
  tagline: string;
  priceMonthly: number;
  priceMonthlyCents: number;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  highlighted: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  entitlements: PlanEntitlements;
  features: string[];
  monthlyAiReplies: number;
};

export type UpsertPlatformPlanInput = {
  id: string;
  label: string;
  tagline?: string;
  priceMonthlyCents: number;
  sortOrder?: number;
  isActive?: boolean;
  isPublic?: boolean;
  highlighted?: boolean;
  entitlements: PlanEntitlements;
  features?: string[];
};

export type UpsertPlatformAddonInput = {
  id: string;
  label: string;
  description?: string;
  priceMonthlyCents: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type PlatformAddonEntitlementBoost = {
  monthlyAiReplies?: number;
  monthlyVoiceMinutes?: number;
  maxTeamSeats?: number;
};

export type PlatformAddonRecord = {
  id: string;
  label: string;
  description: string;
  priceMonthly: number;
  priceMonthlyCents: number;
  sortOrder: number;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  entitlementBoost: PlatformAddonEntitlementBoost;
};

export type BusinessSubscriptionAddon = {
  id: string;
  quantity: number;
};
