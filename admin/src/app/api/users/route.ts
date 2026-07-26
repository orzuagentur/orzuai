import { NextResponse } from "next/server";
import {
  createServiceClient,
  isAdminAuthenticated,
} from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import type { AdminUser } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const { data: profiles, error } = await sb
    .from("profiles")
    .select(
      "id,email,display_name,youtube_connected,youtube_channel_title,daily_videos_enabled,is_admin,stripe_customer_id,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (profiles || []).map((p) => p.id);
  const jobCounts = new Map<string, number>();
  const costMap = new Map<string, number>();
  const subMap = new Map<
    string,
    {
      plan_id: string | null;
      plan_name: string | null;
      plan_slug: string | null;
      status: string;
      cancel_at_period_end: boolean;
      stripe_subscription_id: string | null;
    }
  >();

  if (ids.length) {
    const { data: jobs } = await sb
      .from("video_jobs")
      .select("user_id")
      .in("user_id", ids);
    for (const j of jobs || []) {
      const uid = String(j.user_id);
      jobCounts.set(uid, (jobCounts.get(uid) || 0) + 1);
    }

    const { data: costs } = await sb
      .from("usage_events")
      .select("user_id,cost_usd")
      .in("user_id", ids)
      .gte("created_at", monthStart);
    for (const c of costs || []) {
      const uid = String(c.user_id);
      costMap.set(uid, (costMap.get(uid) || 0) + Number(c.cost_usd || 0));
    }

    const { data: subs } = await sb
      .from("billing_subscriptions")
      .select(
        "user_id,plan_id,status,cancel_at_period_end,stripe_subscription_id,billing_plans(name,slug)",
      )
      .in("user_id", ids);
    for (const s of subs || []) {
      const plan = Array.isArray(s.billing_plans)
        ? s.billing_plans[0]
        : s.billing_plans;
      subMap.set(String(s.user_id), {
        plan_id: s.plan_id || null,
        plan_name: plan?.name || null,
        plan_slug: plan?.slug || null,
        status: String(s.status || "inactive"),
        cancel_at_period_end: Boolean(s.cancel_at_period_end),
        stripe_subscription_id: s.stripe_subscription_id || null,
      });
    }
  }

  const { data: plans } = await sb
    .from("billing_plans")
    .select("id,slug,name,amount_cents,is_active")
    .order("sort_order", { ascending: true });

  const items: AdminUser[] = (profiles || []).map((p) => {
    const sub = subMap.get(p.id);
    return {
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      youtube_connected: Boolean(p.youtube_connected),
      youtube_channel_title: p.youtube_channel_title,
      daily_videos_enabled: Boolean(p.daily_videos_enabled),
      is_admin: Boolean(p.is_admin),
      created_at: p.created_at,
      job_count: jobCounts.get(p.id) || 0,
      cost_usd_month: costMap.get(p.id) || 0,
      plan_name: sub?.plan_name || null,
      plan_slug: sub?.plan_slug || null,
      subscription_status: sub?.status || null,
      cancel_at_period_end: sub?.cancel_at_period_end || false,
      stripe_customer_id: p.stripe_customer_id || null,
    };
  });

  return NextResponse.json({
    items,
    total: items.length,
    plans: plans || [],
  });
}

/** Assign free/comped plan or cancel subscription at period end. */
export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    userId?: string;
    action?: "assign_plan" | "cancel_at_period_end" | "reactivate";
    planId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  const action = body.action;
  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId and action are required" },
      { status: 400 },
    );
  }

  const sb = createServiceClient();
  const { data: sub } = await sb
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (action === "assign_plan") {
    const planId = (body.planId || "").trim();
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }
    const { data: plan } = await sb
      .from("billing_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (sub?.stripe_subscription_id && stripeConfigured()) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch {
        /* continue with DB assign */
      }
    }

    await sb.from("billing_subscriptions").upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        stripe_customer_id: sub?.stripe_customer_id || null,
        stripe_subscription_id: null,
        status: plan.amount_cents > 0 ? "comped" : "active",
        cancel_at_period_end: false,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const videos = Number(
      (plan.entitlements as { videos_per_day?: number })?.videos_per_day || 1,
    );
    await sb
      .from("profiles")
      .update({ videos_per_day: Math.min(5, Math.max(1, videos)) })
      .eq("id", userId);

    return NextResponse.json({ ok: true, status: "assigned" });
  }

  if (action === "cancel_at_period_end") {
    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No Stripe subscription to cancel" },
        { status: 400 },
      );
    }
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY missing" },
        { status: 503 },
      );
    }
    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    await sb
      .from("billing_subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return NextResponse.json({ ok: true, status: "cancel_scheduled" });
  }

  if (action === "reactivate") {
    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No Stripe subscription" },
        { status: 400 },
      );
    }
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY missing" },
        { status: 503 },
      );
    }
    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    await sb
      .from("billing_subscriptions")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return NextResponse.json({ ok: true, status: "reactivated" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
