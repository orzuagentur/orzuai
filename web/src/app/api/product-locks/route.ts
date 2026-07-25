import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProductLocksMap } from "@/lib/product-locks";

export const runtime = "nodejs";

/** Authenticated users: read which product tools are locked. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("product_locks")
    .select("locks")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    // Table may not exist yet — treat as unlocked
    return NextResponse.json({ locks: {} as ProductLocksMap });
  }

  const locks = (data?.locks || {}) as ProductLocksMap;
  return NextResponse.json({ locks });
}
