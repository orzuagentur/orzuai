import { NextResponse } from "next/server";
import { createServiceClient, getAdminUser } from "@/lib/supabase/server";
import {
  deactivatePlanInStripe,
  mapPlanRow,
  syncPlanToStripe,
} from "@/lib/billing/stripe-plans";
import {
  parseEntitlements,
  slugifyPlanName,
  type PlanEntitlements,
  type PlanInterval,
} from "@/lib/billing/types";

export const runtime = "nodejs";

type PlanRow = Parameters<typeof mapPlanRow>[0];

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("billing_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    const missing = /schema cache|does not exist|Could not find the table/i.test(
      error.message || "",
    );
    if (missing) {
      return NextResponse.json({
        items: [],
        pendingMigration: "035_billing",
        error:
          "Run migration 035_billing.sql in Supabase SQL editor, then retry.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row) => mapPlanRow(row as PlanRow));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    slug?: string;
    description?: string;
    amount_cents?: number;
    currency?: string;
    interval?: PlanInterval;
    entitlements?: Partial<PlanEntitlements>;
    is_active?: boolean;
    sort_order?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugifyPlanName(body.slug || name);
  const amount_cents = Math.max(0, Math.floor(Number(body.amount_cents) || 0));
  const entitlements = parseEntitlements(body.entitlements || {});
  const sb = createServiceClient();

  const { data, error } = await sb
    .from("billing_plans")
    .insert({
      name,
      slug,
      description: (body.description || "").trim(),
      amount_cents,
      currency: (body.currency || "eur").toLowerCase(),
      interval: body.interval === "year" ? "year" : "month",
      entitlements,
      is_active: body.is_active !== false,
      sort_order: Number.isFinite(Number(body.sort_order))
        ? Number(body.sort_order)
        : 100,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let plan = mapPlanRow(data as PlanRow);
  try {
    plan = await syncPlanToStripe(sb, plan);
  } catch (e) {
    return NextResponse.json(
      {
        item: plan,
        warning:
          e instanceof Error
            ? e.message
            : "Plan saved but Stripe sync failed",
      },
      { status: 201 },
    );
  }

  return NextResponse.json({ item: plan }, { status: 201 });
}

export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    amount_cents?: number;
    currency?: string;
    interval?: PlanInterval;
    entitlements?: Partial<PlanEntitlements>;
    is_active?: boolean;
    sort_order?: number;
    sync_only?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: existing, error: loadErr } = await sb
    .from("billing_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (body.sync_only) {
    try {
      const plan = await syncPlanToStripe(sb, mapPlanRow(existing as PlanRow));
      return NextResponse.json({ item: plan });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Stripe sync failed" },
        { status: 502 },
      );
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = slugifyPlanName(body.slug);
  }
  if (typeof body.description === "string") {
    patch.description = body.description.trim();
  }
  if (body.amount_cents != null) {
    patch.amount_cents = Math.max(0, Math.floor(Number(body.amount_cents) || 0));
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    patch.currency = body.currency.trim().toLowerCase();
  }
  if (body.interval === "year" || body.interval === "month") {
    patch.interval = body.interval;
  }
  if (body.entitlements) {
    patch.entitlements = parseEntitlements(body.entitlements);
  }
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }
  if (body.sort_order != null && Number.isFinite(Number(body.sort_order))) {
    patch.sort_order = Number(body.sort_order);
  }

  const { data, error } = await sb
    .from("billing_plans")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let plan = mapPlanRow(data as PlanRow);

  if (plan.is_active === false) {
    await deactivatePlanInStripe(plan);
  }

  try {
    plan = await syncPlanToStripe(sb, plan);
  } catch (e) {
    return NextResponse.json({
      item: plan,
      warning:
        e instanceof Error ? e.message : "Plan saved but Stripe sync failed",
    });
  }

  return NextResponse.json({ item: plan });
}
