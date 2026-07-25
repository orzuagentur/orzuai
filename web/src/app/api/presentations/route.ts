import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2Bucket, r2Configured, uploadObject } from "@/lib/r2";
import type { PresentationLibraryItem } from "@/lib/presentation/library";

export const runtime = "nodejs";

function presentationKey(userId: string, id: string) {
  return `${userId}/presentations/${id}.json`;
}

function emptyInfo() {
  return {
    author: "",
    company: "",
    website: "",
    permissions: "",
    notes: "",
  };
}

/** List presentation metadata for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("presentation_library")
    .select(
      "id,title,format,source,storage_path,slide_count,info,created_at,updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    // Table may not exist yet — client falls back to localStorage
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ items: [], pendingMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    format: row.format,
    source: row.source,
    storagePath: row.storage_path,
    slideCount: row.slide_count,
    info: row.info || emptyInfo(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ items });
}

/**
 * Upsert a presentation: JSON body → R2, metadata → Postgres.
 * Body: PresentationLibraryItem (full doc required).
 */
export async function PUT(request: Request) {
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Cloudflare R2 is not configured" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let item: PresentationLibraryItem;
  try {
    item = (await request.json()) as PresentationLibraryItem;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(item.id || "").trim();
  if (!id || !item.doc?.slides?.length) {
    return NextResponse.json(
      { error: "id and doc.slides required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const title = String(item.title || item.doc.title || "Presentation")
    .trim()
    .slice(0, 200);
  const format = item.format === "word" ? "word" : "pdf";
  const source = item.source === "ai" ? "ai" : "classic";
  const info = { ...emptyInfo(), ...(item.info || {}) };
  const storagePath = presentationKey(user.id, id);
  const payload: PresentationLibraryItem = {
    ...item,
    id,
    title,
    format,
    source,
    info,
    updatedAt: now,
    createdAt: item.createdAt || now,
    doc: {
      ...item.doc,
      id,
      title,
      updatedAt: now,
    },
  };

  try {
    await uploadObject({
      key: storagePath,
      body: Buffer.from(JSON.stringify(payload), "utf8"),
      contentType: "application/json",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "R2 upload failed" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("presentation_library")
    .upsert(
      {
        id,
        user_id: user.id,
        title,
        format,
        source,
        storage_path: storagePath,
        storage_bucket: r2Bucket(),
        slide_count: payload.doc.slides.length,
        info,
        created_at: payload.createdAt,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select(
      "id,title,format,source,storage_path,slide_count,info,created_at,updated_at",
    )
    .single();

  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            "Presentation cloud table missing. Apply migration 030_presentation_library.sql",
          pendingMigration: true,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: payload, meta: data });
}
