import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Row = {
  group_name: string | null;
  public_url: string | null;
  hex: string | null;
};

/**
 * GET /api/openmoji/categories
 * Distinct OpenMoji group_name values with counts + sample thumb.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageSize = 1000;
  let from = 0;
  const rows: Row[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("openmoji")
      .select("group_name,public_url,hex")
      .not("group_name", "is", null)
      .neq("group_name", "")
      .order("group_name", { ascending: true })
      .order("hex", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const batch = (data || []) as Row[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const map = new Map<
    string,
    { id: string; label: string; count: number; thumbUrl: string | null }
  >();

  for (const row of rows) {
    const id = String(row.group_name || "").trim();
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(id, {
        id,
        label: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: 1,
        thumbUrl: row.public_url ? String(row.public_url) : null,
      });
    }
  }

  const items = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return NextResponse.json({ items });
}
