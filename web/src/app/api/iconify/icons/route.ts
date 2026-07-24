import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ICONIFY_API,
  SAFE_ICONIFY_SETS,
  getSafeIconifySet,
  iconifySvgUrl,
  isSafeIconifyPrefix,
} from "@/lib/iconify-safe";
import { normalizeSearchQuery } from "@/lib/search-lang";

export const runtime = "nodejs";

type CollectionPayload = {
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  aliases?: Record<string, string>;
  hidden?: string[];
};

/**
 * GET /api/iconify/icons?prefix=lucide&q=home&page=1&limit=96
 * Browse / search icons inside a curated safe Iconify set.
 * Multilingual q → English keywords for Iconify search.
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
  const prefix = String(searchParams.get("prefix") || "").trim();
  const qRaw = String(searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const limit = Math.min(
    200,
    Math.max(24, Number(searchParams.get("limit") || 96) || 96),
  );

  if (prefix && !isSafeIconifyPrefix(prefix)) {
    return NextResponse.json(
      {
        error:
          "Invalid or unsafe icon set. Allowed: " +
          SAFE_ICONIFY_SETS.map((s) => s.prefix).join(", "),
      },
      { status: 400 },
    );
  }

  if (!prefix && !qRaw) {
    return NextResponse.json(
      { error: "Provide prefix or search query" },
      { status: 400 },
    );
  }

  const setMeta = prefix ? getSafeIconifySet(prefix)! : null;

  try {
    if (qRaw) {
      const normalized = await normalizeSearchQuery(qRaw);
      const searchQ = (normalized.en || qRaw).toLowerCase();
      const url = new URL(`${ICONIFY_API}/search`);
      url.searchParams.set("query", searchQ);
      if (prefix) url.searchParams.set("prefix", prefix);
      url.searchParams.set("limit", String(Math.min(999, page * limit + 200)));
      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Iconify search failed (${res.status})` },
          { status: 502 },
        );
      }
      const data = (await res.json()) as {
        icons?: string[];
        total?: number;
      };
      const parsed = (data.icons || [])
        .map((id) => {
          const [p, ...rest] = id.split(":");
          const name = rest.join(":");
          return { prefix: p, name };
        })
        .filter(
          (row) =>
            row.name &&
            isSafeIconifyPrefix(row.prefix) &&
            (!prefix || row.prefix === prefix),
        );

      const total = parsed.length;
      const start = (page - 1) * limit;
      const slice = parsed.slice(start, start + limit);
      const items = slice.map((row) => {
        const meta = getSafeIconifySet(row.prefix);
        return {
          id: `${row.prefix}:${row.name}`,
          prefix: row.prefix,
          name: row.name,
          label: row.name.replace(/-/g, " "),
          svgUrl: iconifySvgUrl(row.prefix, row.name),
          license: meta?.license || "MIT",
        };
      });
      return NextResponse.json({
        items,
        page,
        limit,
        total,
        hasMore: start + items.length < total,
        set: setMeta,
        query: {
          original: normalized.original,
          en: normalized.en,
          lang: normalized.lang,
          translated: normalized.translated,
        },
      });
    }

    // Full collection browse (requires prefix)
    if (!prefix || !setMeta) {
      return NextResponse.json(
        { error: "Provide prefix or search query" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${ICONIFY_API}/collection?prefix=${encodeURIComponent(prefix)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `Iconify collection failed (${res.status})` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as CollectionPayload;
    const hidden = new Set(data.hidden || []);
    const names = new Set<string>();
    for (const n of data.uncategorized || []) {
      if (!hidden.has(n)) names.add(n);
    }
    for (const list of Object.values(data.categories || {})) {
      for (const n of list) {
        if (!hidden.has(n)) names.add(n);
      }
    }
    // aliases point to canonical — skip aliases as separate entries
    const aliasTargets = new Set(Object.keys(data.aliases || {}));
    const sorted = [...names]
      .filter((n) => !aliasTargets.has(n))
      .sort((a, b) => a.localeCompare(b));

    const total = sorted.length;
    const start = (page - 1) * limit;
    const slice = sorted.slice(start, start + limit);
    const items = slice.map((name) => ({
      id: `${prefix}:${name}`,
      prefix,
      name,
      label: name.replace(/-/g, " "),
      svgUrl: iconifySvgUrl(prefix, name),
      license: setMeta.license,
    }));

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: start + items.length < total,
      set: setMeta,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Iconify request failed",
      },
      { status: 502 },
    );
  }
}
