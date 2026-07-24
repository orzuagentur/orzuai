import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPolyHavenAssets,
  parseAssetEntry,
  type PolyHavenAssetMeta,
  type PolyHavenType,
} from "@/lib/polyhaven";
import { normalizeSearchQuery } from "@/lib/search-lang";

export const runtime = "nodejs";

/**
 * List Poly Haven assets (CC0). Paginated + searchable server-side.
 * Multilingual q is normalized to English keywords.
 * Query: type=all|models|hdris|textures, category=, q=, page=, pageSize=
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const typeRaw = (url.searchParams.get("type") || "all").toLowerCase();
  const type: PolyHavenType =
    typeRaw === "models" || typeRaw === "hdris" || typeRaw === "textures"
      ? typeRaw
      : "all";
  const category = (url.searchParams.get("category") || "").trim().toLowerCase();
  const qRaw = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(
    80,
    Math.max(24, Number(url.searchParams.get("pageSize") || 48)),
  );

  try {
    const raw = await fetchPolyHavenAssets(type === "all" ? "all" : type);
    let items: PolyHavenAssetMeta[] = Object.entries(raw).map(([id, meta]) =>
      parseAssetEntry(id, (meta || {}) as Record<string, unknown>),
    );

    if (type !== "all") {
      items = items.filter((a) => a.type === type);
    }
    if (category && category !== "all") {
      items = items.filter((a) =>
        a.categories.some((c) => c.toLowerCase() === category),
      );
    }
    if (qRaw) {
      const normalized = await normalizeSearchQuery(qRaw);
      const needles = Array.from(
        new Set(
          [normalized.en, normalized.original]
            .map((t) => t.toLowerCase().trim())
            .filter(Boolean),
        ),
      );
      items = items.filter((a) => {
        const blob = [
          a.id,
          a.name,
          a.description,
          ...a.tags,
          ...a.categories,
          ...a.authors,
        ]
          .join(" ")
          .toLowerCase();
        return needles.some((n) => blob.includes(n));
      });
    }

    items.sort((a, b) => (b.datePublished || 0) - (a.datePublished || 0));

    const total = items.length;
    const from = (page - 1) * pageSize;
    const slice = items.slice(from, from + pageSize);

    return NextResponse.json({
      items: slice,
      total,
      page,
      pageSize,
      hasMore: from + pageSize < total,
    });
  } catch (e) {
    console.error("[polyhaven/assets]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Poly Haven unavailable" },
      { status: 502 },
    );
  }
}
