import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearchQuery } from "@/lib/search-lang";

export const runtime = "nodejs";

/**
 * GET /api/pixabay/search?q=&kind=photo|video&page=1&perPage=24
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Pixabay is not configured. Add PIXABAY_API_KEY to web/.env.local",
        items: [],
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const qRaw = String(searchParams.get("q") || "").trim() || "business";
  const kind = searchParams.get("kind") === "video" ? "video" : "photo";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const perPage = Math.min(
    40,
    Math.max(12, Number(searchParams.get("perPage") || 24) || 24),
  );

  const normalized = await normalizeSearchQuery(qRaw);
  const q = normalized.en || qRaw;

  try {
    if (kind === "video") {
      const url = new URL("https://pixabay.com/api/videos/");
      url.searchParams.set("key", key);
      url.searchParams.set("q", q);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("safesearch", "true");

      const res = await fetch(url.toString(), { next: { revalidate: 300 } });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: `Pixabay error: ${text.slice(0, 200)}` },
          { status: 502 },
        );
      }
      const data = (await res.json()) as {
        hits?: Array<{
          id: number;
          pageURL: string;
          user: string;
          userURL?: string;
          videos?: {
            medium?: { url: string; width: number; height: number };
            small?: { url: string };
            tiny?: { url: string };
          };
          picture_id?: string;
        }>;
      };

      const items = (data.hits || []).map((hit) => {
        const src =
          hit.videos?.medium?.url ||
          hit.videos?.small?.url ||
          hit.videos?.tiny?.url ||
          "";
        const poster = hit.picture_id
          ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`
          : undefined;
        return {
          id: `pixabay_v_${hit.id}`,
          provider: "pixabay" as const,
          kind: "video" as const,
          src,
          poster,
          thumb: poster || src,
          pageUrl: hit.pageURL,
          author: hit.user,
          authorUrl: hit.userURL || hit.pageURL,
          width: hit.videos?.medium?.width,
          height: hit.videos?.medium?.height,
        };
      });

      return NextResponse.json({
        items,
        query: { original: qRaw, en: q, translated: normalized.translated },
      });
    }

    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", key);
    url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("safesearch", "true");

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Pixabay error: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      hits?: Array<{
        id: number;
        pageURL: string;
        user: string;
        user_id: number;
        webformatURL: string;
        largeImageURL: string;
        previewURL: string;
        imageWidth: number;
        imageHeight: number;
      }>;
    };

    const items = (data.hits || []).map((hit) => ({
      id: `pixabay_p_${hit.id}`,
      provider: "pixabay" as const,
      kind: "photo" as const,
      src: hit.largeImageURL || hit.webformatURL,
      thumb: hit.webformatURL || hit.previewURL,
      pageUrl: hit.pageURL,
      author: hit.user,
      authorUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
      width: hit.imageWidth,
      height: hit.imageHeight,
    }));

    return NextResponse.json({
      items,
      query: { original: qRaw, en: q, translated: normalized.translated },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pixabay request failed" },
      { status: 500 },
    );
  }
}
