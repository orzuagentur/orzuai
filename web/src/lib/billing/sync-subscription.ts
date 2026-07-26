import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { findPlanByPriceId } from "@/lib/billing/entitlements";

function periodEndFromSubscription(sub: Stripe.Subscription): string | null {
  const end = (sub as { current_period_end?: number }).current_period_end;
  if (typeof end === "number" && end > 0) {
    return new Date(end * 1000).toISOString();
  }
  return null;
}

export async function upsertSubscriptionFromStripe(
  sb: SupabaseClient,
  sub: Stripe.Subscription,
  userIdHint?: string | null,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;
  const priceId = sub.items.data[0]?.price?.id || null;
  const plan = priceId ? await findPlanByPriceId(sb, priceId) : null;

  let userId = userIdHint || sub.metadata?.supabase_user_id || null;
  if (!userId && customerId) {
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = profile?.id || null;
  }
  if (!userId) {
    const { data: existing } = await sb
      .from("billing_subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();
    userId = existing?.user_id || null;
  }
  if (!userId) {
    console.warn("[stripe] cannot map subscription to user", sub.id);
    return;
  }

  if (customerId) {
    await sb
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  await sb.from("billing_subscriptions").upsert(
    {
      user_id: userId,
      plan_id: plan?.id || null,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_end: periodEndFromSubscription(sub),
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (plan?.entitlements?.videos_per_day) {
    const max = plan.entitlements.videos_per_day;
    await sb
      .from("profiles")
      .update({ videos_per_day: Math.min(5, Math.max(1, max)) })
      .eq("id", userId);
  }
}

export async function markSubscriptionCanceled(
  sb: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  await sb
    .from("billing_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}
