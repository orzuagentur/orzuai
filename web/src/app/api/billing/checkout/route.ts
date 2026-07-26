import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/middleware";
import { appUrl } from "@/lib/app-url";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { mapPlanRow } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { planId?: string; locale?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = (body.planId || "").trim();
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const locale = (body.locale || "en").trim() || "en";
  const sb = createServiceClient();
  const { data: planRow, error } = await sb
    .from("billing_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!planRow) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = mapPlanRow(planRow);
  if (plan.amount_cents <= 0 || !plan.stripe_price_id) {
    return NextResponse.json(
      { error: "This plan cannot be purchased via Checkout" },
      { status: 400 },
    );
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("stripe_customer_id,email")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await sb
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const base = appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${base}/${locale}/dashboard/billing?success=1`,
    cancel_url: `${base}/${locale}/dashboard/billing?canceled=1`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
        plan_slug: plan.slug,
      },
    },
    metadata: {
      supabase_user_id: user.id,
      plan_id: plan.id,
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
