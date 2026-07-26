export type PlanInterval = "month" | "year";

export type PlanEntitlements = {
  videos_per_day: number;
  creators: boolean;
  presentation: boolean;
  libraries: boolean;
  worker_priority: boolean;
};

export const DEFAULT_ENTITLEMENTS: PlanEntitlements = {
  videos_per_day: 1,
  creators: false,
  presentation: false,
  libraries: false,
  worker_priority: false,
};

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amount_cents: number;
  currency: string;
  interval: PlanInterval;
  entitlements: PlanEntitlements;
  is_active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "inactive"
  | "comped";

export type BillingSubscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: BillingSubscriptionStatus | string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at?: string;
  updated_at?: string;
};

export function parseEntitlements(raw: unknown): PlanEntitlements {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const videos = Number(obj.videos_per_day);
  return {
    videos_per_day:
      Number.isFinite(videos) && videos >= 1
        ? Math.min(30, Math.floor(videos))
        : DEFAULT_ENTITLEMENTS.videos_per_day,
    creators: Boolean(obj.creators),
    presentation: Boolean(obj.presentation),
    libraries: Boolean(obj.libraries),
    worker_priority: Boolean(obj.worker_priority),
  };
}

export function formatPlanPrice(plan: Pick<BillingPlan, "amount_cents" | "currency" | "interval">): string {
  if (plan.amount_cents <= 0) return "Free";
  const amount = (plan.amount_cents / 100).toFixed(
    plan.amount_cents % 100 === 0 ? 0 : 2,
  );
  const cur = (plan.currency || "eur").toUpperCase();
  const suffix = plan.interval === "year" ? "/yr" : "/mo";
  if (cur === "EUR") return `€${amount}${suffix}`;
  if (cur === "USD") return `$${amount}${suffix}`;
  return `${amount} ${cur}${suffix}`;
}
