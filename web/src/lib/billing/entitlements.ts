import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_ENTITLEMENTS,
  parseEntitlements,
  type BillingPlan,
  type PlanEntitlements,
  type PlanInterval,
} from "@/lib/billing/types";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amount_cents: number;
  currency: string;
  interval: string;
  entitlements: unknown;
  is_active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

export function mapPlanRow(row: PlanRow): BillingPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    amount_cents: Number(row.amount_cents) || 0,
    currency: (row.currency || "eur").toLowerCase(),
    interval: (row.interval === "year" ? "year" : "month") as PlanInterval,
    entitlements: parseEntitlements(row.entitlements),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order) || 0,
    stripe_product_id: row.stripe_product_id,
    stripe_price_id: row.stripe_price_id,
  };
}

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "comped",
]);

export async function getFreePlan(
  sb: SupabaseClient,
): Promise<BillingPlan | null> {
  const { data } = await sb
    .from("billing_plans")
    .select("*")
    .eq("slug", "free")
    .maybeSingle();
  return data ? mapPlanRow(data as PlanRow) : null;
}

export async function listActivePlans(
  sb: SupabaseClient,
): Promise<BillingPlan[]> {
  const { data, error } = await sb
    .from("billing_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapPlanRow(row as PlanRow));
}

export async function getUserEntitlements(
  sb: SupabaseClient,
  userId: string,
): Promise<{
  entitlements: PlanEntitlements;
  plan: BillingPlan | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}> {
  const { data: sub } = await sb
    .from("billing_subscriptions")
    .select(
      "status,cancel_at_period_end,current_period_end,plan_id,billing_plans(*)",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const status = String(sub?.status || "inactive");
  const linked = sub?.billing_plans
    ? mapPlanRow(
        (Array.isArray(sub.billing_plans)
          ? sub.billing_plans[0]
          : sub.billing_plans) as PlanRow,
      )
    : null;

  if (sub && ACTIVE_STATUSES.has(status) && linked) {
    return {
      entitlements: linked.entitlements,
      plan: linked,
      status,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodEnd: sub.current_period_end
        ? String(sub.current_period_end)
        : null,
    };
  }

  const free = await getFreePlan(sb);
  return {
    entitlements: free?.entitlements || DEFAULT_ENTITLEMENTS,
    plan: free,
    status: free ? "free" : "inactive",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

export async function findPlanByPriceId(
  sb: SupabaseClient,
  priceId: string,
): Promise<BillingPlan | null> {
  const { data } = await sb
    .from("billing_plans")
    .select("*")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data ? mapPlanRow(data as PlanRow) : null;
}
