import { NextResponse } from "next/server";
import { createServiceClient, getAdminUser } from "@/lib/supabase/server";
import {
  PRODUCT_LOCK_FEATURES,
  type ProductLockId,
  type ProductLocksMap,
} from "@/lib/product-locks";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("product_locks")
    .select("locks,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    // Table not migrated yet — treat as unlocked instead of 500
    const missing =
      /schema cache|does not exist|Could not find the table/i.test(
        error.message || "",
      );
    if (missing) {
      return NextResponse.json({
        locks: {} as ProductLocksMap,
        updatedAt: null,
        features: PRODUCT_LOCK_FEATURES,
        pendingMigration: "029_product_locks",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    locks: (data?.locks || {}) as ProductLocksMap,
    updatedAt: data?.updated_at || null,
    features: PRODUCT_LOCK_FEATURES,
  });
}

export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { locks?: ProductLocksMap };
  try {
    body = (await request.json()) as { locks?: ProductLocksMap };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body.locks || {};
  const allowed = new Set(PRODUCT_LOCK_FEATURES.map((f) => f.id));
  const locks: ProductLocksMap = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (allowed.has(k as ProductLockId)) {
      locks[k as ProductLockId] = Boolean(v);
    }
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("product_locks")
    .upsert(
      {
        id: 1,
        locks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("locks,updated_at")
    .single();

  if (error) {
    const missing =
      /schema cache|does not exist|Could not find the table/i.test(
        error.message || "",
      );
    if (missing) {
      return NextResponse.json(
        {
          error:
            "Run migration 029_product_locks.sql in the OrzuVideo Supabase SQL editor, then retry.",
          pendingMigration: "029_product_locks",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    locks: (data?.locks || {}) as ProductLocksMap,
    updatedAt: data?.updated_at || null,
  });
}
