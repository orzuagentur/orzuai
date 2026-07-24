import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeSearchQuery,
  unsplashSearchLang,
} from "@/lib/search-lang";
import {
  UNSPLASH_API,
  mapUnsplashPhoto,
  unsplashAccessKey,
  unsplashAuthHeaders,
} from "@/lib/unsplash";

export const runtime = "nodejs";

/**
 * GET /api/unsplash/photos?q=&topic=&page=1&perPage=30
 * Multilingual `q`: non-English → English keywords via OpenAI, plus Unsplash `lang`.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!unsplashAccessKey()) {
    return NextResponse.json(
      {
        error:
          "Unsplash is not configured. Add UNSPLASH_ACCESS_KEY to web/.env.local",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim();
  const topic = String(searchParams.get("topic") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const perPage = Math.min(
    30,
    Math.max(12, Number(searchParams.get("perPage") || 30) || 30),
  );

  try {
    let endpoint: URL;
    let queryMeta: {
      lang?: string;
      en?: string;
      original?: string;
      translated?: boolean;
    } | null = null;

    if (q) {
      const normalized = await normalizeSearchQuery(q);
      queryMeta = {
        lang: normalized.lang,
        en: normalized.en,
        original: normalized.original,
        translated: normalized.translated,
      };
      endpoint = new URL(`${UNSPLASH_API}/search/photos`);
      endpoint.searchParams.set("query", normalized.en.slice(0, 120));
      endpoint.searchParams.set("content_filter", "high");
      const lang = unsplashSearchLang(normalized.lang);
      if (lang && lang !== "en") {
        endpoint.searchParams.set("lang", lang);
      }
    } else if (topic) {
      endpoint = new URL(
        `${UNSPLASH_API}/topics/${encodeURIComponent(topic)}/photos`,
      );
    } else {
      endpoint = new URL(`${UNSPLASH_API}/photos`);
      endpoint.searchParams.set("order_by", "popular");
    }
    endpoint.searchParams.set("page", String(page));
    endpoint.searchParams.set("per_page", String(perPage));

    const res = await fetch(endpoint.toString(), {
      headers: unsplashAuthHeaders(),
      next: { revalidate: q ? 120 : 600 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Unsplash photos failed (${res.status})`,
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];

    const items = rawList
      .map((row: unknown) =>
        mapUnsplashPhoto(row as Parameters<typeof mapUnsplashPhoto>[0]),
      )
      .filter(Boolean);

    const total = Number(data?.total ?? items.length);
    const totalPages = Number(
      data?.total_pages ?? (items.length < perPage ? page : page + 1),
    );
    const hasMore = q ? page < totalPages : items.length >= perPage;

    return NextResponse.json({
      items,
      page,
      perPage,
      total: q ? total : undefined,
      hasMore,
      query: queryMeta,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unsplash unavailable" },
      { status: 502 },
    );
  }
}
