import { NextResponse } from "next/server";
import {
  isSubtitleStyleId,
  subtitlePreviewR2Key,
  subtitlePreviewSourceUrl,
} from "@/lib/subtitle-preview-sources";
import {
  objectExists,
  publicObjectUrl,
  r2Configured,
  uploadObject,
} from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/middleware";

export const runtime = "nodejs";

const IMAGE_CACHE =
  "public, max-age=86400, stale-while-revalidate=604800";

async function readCachedUrl(styleId: string): Promise<string | null> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from("subtitle_preview_assets")
      .select("public_url")
      .eq("style_id", styleId)
      .maybeSingle();
    return data?.public_url ? String(data.public_url) : null;
  } catch {
    return null;
  }
}

async function saveCachedUrl(
  styleId: string,
  storagePath: string,
  publicUrl: string,
  sourceUrl: string,
): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from("subtitle_preview_assets").upsert(
      {
        style_id: styleId,
        storage_path: storagePath,
        public_url: publicUrl,
        source_url: sourceUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "style_id" },
    );
  } catch {
    /* table may be missing until migration applied */
  }
}

async function imageBytesFromUrl(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": IMAGE_CACHE,
      },
    });
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const styleId = decodeURIComponent(rawId || "").trim();
  if (!isSubtitleStyleId(styleId)) {
    return NextResponse.json({ error: "Unknown style" }, { status: 404 });
  }

  const fromDb = await readCachedUrl(styleId);
  if (fromDb) {
    const proxied = await imageBytesFromUrl(fromDb);
    if (proxied) return proxied;
    return NextResponse.redirect(fromDb, 302);
  }

  const key = subtitlePreviewR2Key(styleId);
  if (r2Configured()) {
    try {
      if (await objectExists(key)) {
        const url = publicObjectUrl(key);
        await saveCachedUrl(
          styleId,
          key,
          url,
          subtitlePreviewSourceUrl(styleId) || "",
        );
        const proxied = await imageBytesFromUrl(url);
        if (proxied) return proxied;
        return NextResponse.redirect(url, 302);
      }
    } catch {
      /* fall through to fetch */
    }
  }

  const source = subtitlePreviewSourceUrl(styleId);
  if (!source) {
    return NextResponse.json({ error: "No source" }, { status: 404 });
  }

  if (!r2Configured()) {
    const proxied = await imageBytesFromUrl(source);
    if (proxied) return proxied;
    return NextResponse.redirect(source, 302);
  }

  try {
    const res = await fetch(source, {
      headers: {
        Accept: "image/*",
        "User-Agent": "OrzuVideo/1.0 (subtitle-preview-cache)",
      },
      cache: "force-cache",
    });
    if (!res.ok) {
      const proxied = await imageBytesFromUrl(source);
      if (proxied) return proxied;
      return NextResponse.redirect(source, 302);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const uploaded = await uploadObject({
      key,
      body: buf,
      contentType,
    });
    await saveCachedUrl(styleId, uploaded.key, uploaded.publicUrl, source);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": IMAGE_CACHE,
      },
    });
  } catch {
    const proxied = await imageBytesFromUrl(source);
    if (proxied) return proxied;
    return NextResponse.redirect(source, 302);
  }
}
