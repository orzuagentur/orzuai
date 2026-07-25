import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteObject, getObjectText, r2Configured } from "@/lib/r2";
import type { PresentationLibraryItem } from "@/lib/presentation/library";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Load full presentation JSON from R2. */
export async function GET(_request: Request, ctx: Ctx) {
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Cloudflare R2 is not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const presentationId = String(id || "").trim();
  if (!presentationId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("presentation_library")
    .select("id,storage_path,user_id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const text = await getObjectText(row.storage_path);
  if (!text) {
    return NextResponse.json(
      { error: "Presentation file missing in storage" },
      { status: 404 },
    );
  }

  try {
    const item = JSON.parse(text) as PresentationLibraryItem;
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Corrupt presentation file" }, { status: 500 });
  }
}

/** Delete metadata + R2 object. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const presentationId = String(id || "").trim();
  if (!presentationId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("presentation_library")
    .select("storage_path")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("presentation_library")
    .delete()
    .eq("id", presentationId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (row?.storage_path && r2Configured()) {
    try {
      await deleteObject(row.storage_path);
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}
