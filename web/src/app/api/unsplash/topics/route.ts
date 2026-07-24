import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  UNSPLASH_API,
  unsplashAccessKey,
  unsplashAuthHeaders,
  type UnsplashTopicCard,
} from "@/lib/unsplash";

export const runtime = "nodejs";

/**
 * GET /api/unsplash/topics?page=1&perPage=24
 * Editorial topics as Creators → Photos categories (paginated for infinite scroll).
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
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const perPage = Math.min(
    30,
    Math.max(12, Number(searchParams.get("perPage") || 24) || 24),
  );

  try {
    const url = new URL(`${UNSPLASH_API}/topics`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("order_by", "featured");
    const res = await fetch(url.toString(), {
      headers: unsplashAuthHeaders(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Unsplash topics failed (${res.status})`,
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
    const data = (await res.json()) as Array<{
      id?: string;
      slug?: string;
      title?: string;
      description?: string | null;
      total_photos?: number;
      cover_photo?: {
        urls?: { regular?: string; small?: string; thumb?: string };
      };
    }>;

    const items: UnsplashTopicCard[] = (data || [])
      .map((t) => {
        const slug = String(t.slug || "").trim();
        const id = String(t.id || slug).trim();
        if (!slug || !id) return null;
        const cover = t.cover_photo?.urls;
        return {
          id,
          slug,
          label: String(t.title || slug),
          description: t.description ? String(t.description) : null,
          count: Number(t.total_photos || 0),
          thumbUrl: cover?.regular || cover?.small || cover?.thumb || null,
        } satisfies UnsplashTopicCard;
      })
      .filter(Boolean) as UnsplashTopicCard[];

    return NextResponse.json({
      items,
      page,
      perPage,
      hasMore: items.length >= perPage,
      policy:
        "Hotlink urls.* only; ping download_location on use; attribute with utm_source=orzuai",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unsplash unavailable" },
      { status: 502 },
    );
  }
}
