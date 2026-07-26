import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
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
  created_at?: string;
  updated_at?: string;
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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create or update Stripe Product + Price for a paid plan.
 * Free plans (amount_cents === 0) clear Stripe IDs.
 * Price changes create a new Price and archive the old one.
 */
export async function syncPlanToStripe(
  sb: SupabaseClient,
  plan: BillingPlan,
): Promise<BillingPlan> {
  if (plan.amount_cents <= 0) {
    const { data, error } = await sb
      .from("billing_plans")
      .update({
        stripe_product_id: null,
        stripe_price_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapPlanRow(data as PlanRow);
  }

  if (!stripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY is required to sync paid plans");
  }

  const stripe = getStripe();
  const currency = plan.currency.toLowerCase();
  const interval = plan.interval === "year" ? "year" : "month";
  const meta = {
    plan_id: plan.id,
    plan_slug: plan.slug,
  };

  let productId = plan.stripe_product_id;
  if (productId) {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description || undefined,
      active: plan.is_active,
      metadata: meta,
    });
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      active: plan.is_active,
      metadata: meta,
    });
    productId = product.id;
  }

  let priceId = plan.stripe_price_id;
  let needNewPrice = !priceId;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId);
    const same =
      existing.unit_amount === plan.amount_cents &&
      existing.currency === currency &&
      existing.recurring?.interval === interval &&
      existing.active;
    if (!same) {
      if (existing.active) {
        await stripe.prices.update(priceId, { active: false });
      }
      needNewPrice = true;
    }
  }

  if (needNewPrice) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: plan.amount_cents,
      currency,
      recurring: { interval },
      metadata: meta,
    });
    priceId = price.id;
    await stripe.products.update(productId, { default_price: priceId });
  }

  const { data, error } = await sb
    .from("billing_plans")
    .update({
      stripe_product_id: productId,
      stripe_price_id: priceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", plan.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapPlanRow(data as PlanRow);
}

export async function deactivatePlanInStripe(plan: BillingPlan): Promise<void> {
  if (!stripeConfigured()) return;
  const stripe = getStripe();
  if (plan.stripe_price_id) {
    try {
      await stripe.prices.update(plan.stripe_price_id, { active: false });
    } catch {
      /* ignore */
    }
  }
  if (plan.stripe_product_id) {
    try {
      await stripe.products.update(plan.stripe_product_id, { active: false });
    } catch {
      /* ignore */
    }
  }
}

export type PlanInput = {
  name: string;
  slug: string;
  description?: string;
  amount_cents: number;
  currency?: string;
  interval?: PlanInterval;
  entitlements?: Partial<PlanEntitlements>;
  is_active?: boolean;
  sort_order?: number;
};
