import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EFFECT_IDS,
  FADE_IDS,
  MOTION_IDS,
  SUBTITLE_STYLE_IDS,
  TEXT_STYLE_IDS,
  TRANSITION_IDS,
} from "@/lib/editor-catalog";

export const runtime = "nodejs";

function parentLibrary(meta: Record<string, unknown> | null): "creativity" | "clipping" {
  const src = String(meta?.source || "").toLowerCase();
  const pipe = String(meta?.pipeline || "").toLowerCase();
  if (src === "ai_clipping" || pipe === "ai_clipping" || src === "clipping") {
    return "clipping";
  }
  if (src === "reedit" && meta?.library === "clipping") return "clipping";
  return "creativity";
}

/** Queue a re-edit of an existing ready video (new job, keeps original). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source_job_id = String(body.source_job_id || "").trim();
  if (!source_job_id) {
    return NextResponse.json({ error: "source_job_id required" }, { status: 400 });
  }

  const { data: parent, error: parentErr } = await supabase
    .from("video_jobs")
    .select(
      "id,user_id,status,title,preview_url,storage_path,storage_bucket,duration_seconds,metadata",
    )
    .eq("id", source_job_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (parentErr) {
    return NextResponse.json({ error: parentErr.message }, { status: 500 });
  }
  if (!parent) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (parent.status !== "ready") {
    return NextResponse.json(
      { error: "Only ready videos can be edited" },
      { status: 400 },
    );
  }
  if (!parent.storage_path && !parent.preview_url) {
    return NextResponse.json(
      { error: "Source video file is missing" },
      { status: 400 },
    );
  }

  const effect = String(body.effect || "none").trim();
  const motion = String(body.motion || "none").trim();
  const intro_fade = String(body.intro_fade || "none").trim();
  const outro_fade = String(body.outro_fade || "none").trim();
  const preferred_transition = String(body.preferred_transition || "fade").trim();
  const subtitle_style = String(body.subtitle_style || "classic").trim();
  const text_style = String(body.text_style || "bold_center").trim();
  const overlay_text = String(body.overlay_text || "").trim().slice(0, 120);
  const caption_text = String(body.caption_text || "").trim().slice(0, 120);

  if (!EFFECT_IDS.has(effect)) {
    return NextResponse.json({ error: "Invalid effect" }, { status: 400 });
  }
  if (!MOTION_IDS.has(motion)) {
    return NextResponse.json({ error: "Invalid motion" }, { status: 400 });
  }
  if (!FADE_IDS.has(intro_fade) || !FADE_IDS.has(outro_fade)) {
    return NextResponse.json({ error: "Invalid fade" }, { status: 400 });
  }
  if (!TRANSITION_IDS.has(preferred_transition)) {
    return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
  }
  if (!SUBTITLE_STYLE_IDS.has(subtitle_style)) {
    return NextResponse.json({ error: "Invalid subtitle style" }, { status: 400 });
  }
  if (!TEXT_STYLE_IDS.has(text_style)) {
    return NextResponse.json({ error: "Invalid text style" }, { status: 400 });
  }

  const music_mode = String(body.music_mode || "none").trim();
  const music_track_id =
    music_mode === "track"
      ? String(body.music_track_id || "").trim() || null
      : null;
  let music_volume = 0.45;
  try {
    music_volume = Math.max(
      0.05,
      Math.min(1, Number(body.music_volume ?? 0.45)),
    );
  } catch {
    music_volume = 0.45;
  }
  const keep_original_audio = body.keep_original_audio !== false;

  let playback_speed = 1;
  try {
    playback_speed = Math.max(0.25, Math.min(4, Number(body.playback_speed ?? 1)));
  } catch {
    playback_speed = 1;
  }
  const flip_h = body.flip_h === true;
  const flip_v = body.flip_v === true;
  let zoom = 1;
  try {
    zoom = Math.max(1, Math.min(2, Number(body.zoom ?? 1)));
  } catch {
    zoom = 1;
  }
  let brightness = 0;
  let contrast = 1;
  let saturation = 1;
  let voice_volume = 1.05;
  try {
    brightness = Math.max(-0.4, Math.min(0.4, Number(body.brightness ?? 0)));
  } catch {
    brightness = 0;
  }
  try {
    contrast = Math.max(0.5, Math.min(1.8, Number(body.contrast ?? 1)));
  } catch {
    contrast = 1;
  }
  try {
    saturation = Math.max(0, Math.min(2, Number(body.saturation ?? 1)));
  } catch {
    saturation = 1;
  }
  try {
    voice_volume = Math.max(0.05, Math.min(1.4, Number(body.voice_volume ?? 1.05)));
  } catch {
    voice_volume = 1.05;
  }

  let trim_start = 0;
  let trim_end: number | null = null;
  try {
    trim_start = Math.max(0, Number(body.trim_start ?? 0));
  } catch {
    trim_start = 0;
  }
  if (body.trim_end != null && body.trim_end !== "") {
    try {
      trim_end = Math.max(trim_start + 0.5, Number(body.trim_end));
    } catch {
      trim_end = null;
    }
  }

  const parentMeta = (parent.metadata || {}) as Record<string, unknown>;
  const library = parentLibrary(parentMeta);
  const baseTitle = String(parent.title || "Video").trim() || "Video";
  const title = baseTitle.endsWith("(edit)")
    ? baseTitle
    : `${baseTitle.slice(0, 60)} (edit)`;

  const metadata = {
    source: "reedit",
    pipeline: "reedit",
    publish: false,
    parent_job_id: parent.id,
    library,
    parent_source: String(parentMeta.source || library),
    effect,
    motion,
    intro_fade,
    outro_fade,
    preferred_transition,
    subtitle_style,
    text_style,
    overlay_text: overlay_text || null,
    caption_text: caption_text || null,
    music_mode,
    music_track_id,
    music_volume,
    keep_original_audio,
    playback_speed,
    flip_h,
    flip_v,
    zoom,
    brightness,
    contrast,
    saturation,
    voice_volume,
    trim_start,
    trim_end,
    excluded_source_ids: Array.isArray(body.excluded_source_ids)
      ? (body.excluded_source_ids as unknown[])
          .map((x) => String(x))
          .filter(Boolean)
          .slice(0, 40)
      : [],
    source_storage_path: parent.storage_path,
    source_storage_bucket: parent.storage_bucket || "short-previews",
    source_preview_url: parent.preview_url,
    aspect_ratio: parentMeta.aspect_ratio || "9:16",
  };

  const { data: job, error } = await supabase
    .from("video_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      title,
      script_text: null,
      description: null,
      scheduled_for: new Date().toISOString(),
      duration_seconds:
        trim_end != null
          ? Math.round(trim_end - trim_start)
          : parent.duration_seconds,
      metadata,
    })
    .select("id,status,title,metadata")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job });
}
