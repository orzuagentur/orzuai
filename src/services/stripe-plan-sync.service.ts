import "server-only";

import { getStripeClient, hasStripeEnv } from "@/lib/stripe/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlatformPlan,
  invalidatePlatformPlansCache,
  listPlatformPlans,
  updatePlatformPlanStripeIds,
} from "@/services/platform-plans.service";
import type {
  PlatformSubscriptionAddonRow,
  UpsertPlatformAddonInput,
} from "@/types/platform-plans.types";

export async function syncPlatformPlanToStripe(planId: string): Promise<
  | { success: true; stripeProductId: string; stripePriceId: string }
  | { success: false; message: string }
> {
  if (!hasStripeEnv()) {
    return { success: false, message: "STRIPE_SECRET_KEY is not configured." };
  }

  const plan = await getPlatformPlan(planId);

  if (!plan) {
    return { success: false, message: "Plan not found." };
  }

  if (plan.priceMonthlyCents <= 0) {
    return {
      success: false,
      message: "Free plans do not require a Stripe price.",
    };
  }

  const stripe = getStripeClient();
  let productId = plan.stripeProductId ?? undefined;

  if (!productId) {
    const product = await stripe.products.create({
      name: `OrzuX ${plan.label}`,
      description: plan.tagline || undefined,
      metadata: {
        plan_id: plan.id,
        platform: "orzux",
      },
    });
    productId = product.id;
  } else {
    await stripe.products.update(productId, {
      name: `OrzuX ${plan.label}`,
      description: plan.tagline || undefined,
    });
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.priceMonthlyCents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      plan_id: plan.id,
      platform: "orzux",
    },
  });

  if (plan.stripePriceId && plan.stripePriceId !== price.id) {
    try {
      await stripe.prices.update(plan.stripePriceId, { active: false });
    } catch {
      // Old price may already be archived.
    }
  }

  await updatePlatformPlanStripeIds({
    planId: plan.id,
    stripeProductId: productId,
    stripePriceId: price.id,
  });

  return {
    success: true,
    stripeProductId: productId,
    stripePriceId: price.id,
  };
}

export async function syncAllPaidPlansToStripe(): Promise<
  | {
      success: true;
      synced: Array<{ planId: string; stripePriceId: string }>;
      skipped: string[];
      errors: Array<{ planId: string; message: string }>;
    }
  | { success: false; message: string }
> {
  const plans = await listPlatformPlans({ activeOnly: true, force: true });
  const synced: Array<{ planId: string; stripePriceId: string }> = [];
  const skipped: string[] = [];
  const errors: Array<{ planId: string; message: string }> = [];

  for (const plan of plans) {
    if (plan.priceMonthlyCents <= 0) {
      skipped.push(plan.id);
      continue;
    }

    const result = await syncPlatformPlanToStripe(plan.id);

    if (result.success) {
      synced.push({ planId: plan.id, stripePriceId: result.stripePriceId });
    } else {
      errors.push({ planId: plan.id, message: result.message });
    }
  }

  return { success: true, synced, skipped, errors };
}

export async function syncPlatformAddonToStripe(addonId: string): Promise<
  | { success: true; stripeProductId: string; stripePriceId: string }
  | { success: false; message: string }
> {
  if (!hasStripeEnv() || !hasSupabaseEnv()) {
    return { success: false, message: "Stripe or database is not configured." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_subscription_addons")
    .select("*")
    .eq("id", addonId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Add-on not found." };
  }

  const addon = data as unknown as PlatformSubscriptionAddonRow;

  if (addon.price_monthly_cents <= 0) {
    return { success: false, message: "Add-on price must be greater than zero." };
  }

  const stripe = getStripeClient();
  let productId = addon.stripe_product_id ?? undefined;

  if (!productId) {
    const product = await stripe.products.create({
      name: `OrzuX ${addon.label}`,
      description: addon.description || undefined,
      metadata: {
        addon_id: addon.id,
        platform: "orzux",
      },
    });
    productId = product.id;
  } else {
    await stripe.products.update(productId, {
      name: `OrzuX ${addon.label}`,
      description: addon.description || undefined,
    });
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: addon.price_monthly_cents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      addon_id: addon.id,
      platform: "orzux",
    },
  });

  if (addon.stripe_price_id && addon.stripe_price_id !== price.id) {
    try {
      await stripe.prices.update(addon.stripe_price_id, { active: false });
    } catch {
      // ignore
    }
  }

  await admin
    .from("platform_subscription_addons")
    .update({
      stripe_product_id: productId,
      stripe_price_id: price.id,
    })
    .eq("id", addon.id);

  invalidatePlatformPlansCache();

  return {
    success: true,
    stripeProductId: productId,
    stripePriceId: price.id,
  };
}

export async function syncAllAddonsToStripe(): Promise<
  | {
      success: true;
      synced: Array<{ addonId: string; stripePriceId: string }>;
      errors: Array<{ addonId: string; message: string }>;
    }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_subscription_addons")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return { success: false, message: error.message };
  }

  const synced: Array<{ addonId: string; stripePriceId: string }> = [];
  const errors: Array<{ addonId: string; message: string }> = [];

  for (const row of data ?? []) {
    const result = await syncPlatformAddonToStripe(row.id as string);

    if (result.success) {
      synced.push({ addonId: row.id as string, stripePriceId: result.stripePriceId });
    } else {
      errors.push({ addonId: row.id as string, message: result.message });
    }
  }

  return { success: true, synced, errors };
}

export async function upsertPlatformAddon(
  input: UpsertPlatformAddonInput,
): Promise<{ success: true; id: string } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_subscription_addons").upsert({
    id: input.id.trim().toLowerCase(),
    label: input.label.trim(),
    description: input.description?.trim() ?? "",
    price_monthly_cents: input.priceMonthlyCents,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, id: input.id.trim().toLowerCase() };
}

export async function listPlatformAddons(): Promise<PlatformSubscriptionAddonRow[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_subscription_addons")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as unknown as PlatformSubscriptionAddonRow[];
}
