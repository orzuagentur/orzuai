import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearchQuery } from "@/lib/search-lang";

export const runtime = "nodejs";

/**
 * List OpenMoji SVGs from public.openmoji (platform catalog).
 * Auth required. Multilingual q is normalized to English keywords.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qRaw = String(searchParams.get("q") || "").trim();
  const group = String(searchParams.get("group") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const limit = Math.min(
    200,
    Math.max(24, Number(searchParams.get("limit") || 96) || 96),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("openmoji")
    .select(
      "hex,filename,storage_path,public_url,byte_size,name,tags,group_name,subgroup",
      { count: "exact" },
    )
    .order("hex", { ascending: true })
    .range(from, to);

  if (group) {
    query = query.eq("group_name", group);
  }

  if (qRaw) {
    const normalized = await normalizeSearchQuery(qRaw);
    const terms = Array.from(
      new Set(
        [normalized.en, normalized.original]
          .map((t) => t.toLowerCase().replace(/[%_,]/g, "").slice(0, 64))
          .filter(Boolean),
      ),
    );
    const parts: string[] = [];
    for (const safe of terms) {
      parts.push(
        `name.ilike.%${safe}%`,
        `tags.ilike.%${safe}%`,
        `hex.ilike.%${safe}%`,
        `filename.ilike.%${safe}%`,
        `group_name.ilike.%${safe}%`,
        `subgroup.ilike.%${safe}%`,
      );
    }
    if (parts.length) query = query.or(parts.join(","));
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row) => ({
    hex: String(row.hex),
    filename: String(row.filename),
    storage_path: String(row.storage_path),
    public_url: String(row.public_url),
    byte_size: Number(row.byte_size || 0),
    name: row.name ? String(row.name) : null,
    tags: row.tags ? String(row.tags) : null,
    group_name: row.group_name ? String(row.group_name) : null,
    subgroup: row.subgroup ? String(row.subgroup) : null,
  }));

  const total = count ?? items.length;
  const hasMore = from + items.length < total;

  return NextResponse.json({
    items,
    page,
    limit,
    total,
    hasMore,
  });
}
