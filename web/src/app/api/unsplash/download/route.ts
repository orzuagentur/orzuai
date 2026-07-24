import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedUnsplashDownloadLocation,
  unsplashAccessKey,
  unsplashAuthHeaders,
} from "@/lib/unsplash";

export const runtime = "nodejs";

/**
 * POST /api/unsplash/download
 * Body: { downloadLocation: string }
 *
 * Guideline: when the user performs a download-like action, ping
 * photo.links.download_location (tracking only — do not use response as image URL).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!unsplashAccessKey()) {
    return NextResponse.json(
      { error: "UNSPLASH_ACCESS_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: { downloadLocation?: string };
  try {
    body = (await request.json()) as { downloadLocation?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const downloadLocation = String(body.downloadLocation || "").trim();
  if (!downloadLocation || !isAllowedUnsplashDownloadLocation(downloadLocation)) {
    return NextResponse.json(
      { error: "Invalid download_location" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(downloadLocation, {
      headers: unsplashAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Unsplash download ping failed (${res.status})` },
        { status: 502 },
      );
    }
    // Response may include a url — guidelines say do not use it for embedding;
    // we only confirm the tracking ping succeeded.
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Unsplash download ping failed",
      },
      { status: 502 },
    );
  }
}
