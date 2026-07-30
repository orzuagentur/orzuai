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
import { isVideoFrameId } from "@/lib/video-frames";

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
      "id,user_id,status,title,script_text,description,preview_url,storage_path,storage_bucket,duration_seconds,metadata",
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
  const frame_style_raw = String(body.frame_style || "").trim();
  const frame_style = isVideoFrameId(frame_style_raw) ? frame_style_raw : null;
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
  const voice_id = String(body.voice_id || "").trim().slice(0, 120) || null;
  const voice_text = String(
    body.voice_text || parent.script_text || parent.title || "",
  )
    .trim()
    .slice(0, 5000);
  const selected_element =
    body.selected_element && typeof body.selected_element === "object"
      ? body.selected_element
      : null;

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
  let caption_scale = 1;
  try {
    caption_scale = Math.max(0.5, Math.min(1.75, Number(body.caption_scale ?? 1)));
  } catch {
    caption_scale = 1;
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
  const source_clips = Array.isArray(body.source_clips)
    ? (body.source_clips as unknown[])
        .filter((item): item is Record<string, unknown> => {
          return Boolean(item && typeof item === "object");
        })
        .slice(0, 80)
    : [];
  const scene_durations = Array.isArray(body.scene_durations)
    ? (body.scene_durations as unknown[])
        .map((item, index) => {
          if (item && typeof item === "object") {
            const row = item as Record<string, unknown>;
            const originalRaw = Number(row.original_index ?? row.source_index ?? index);
            const original_index = Number.isFinite(originalRaw)
              ? Math.max(0, Math.min(79, Math.floor(originalRaw)))
              : index;
            const duration = Math.max(
              0.5,
              Math.min(120, Number(row.duration) || 0),
            );
            return {
              id: String(row.id || `scene-${index + 1}`),
              index,
              original_index,
              label: String(row.label || `Scene ${index + 1}`).slice(0, 80),
              duration,
            };
          }
          return {
            id: `scene-${index + 1}`,
            index,
            original_index: index,
            label: `Scene ${index + 1}`,
            duration: Math.max(0.5, Math.min(120, Number(item) || 0)),
          };
        })
        .filter((item) => item.duration > 0)
        .slice(0, 80)
    : [];
  const parentSceneCount = Array.isArray(parentMeta.source_clips)
    ? parentMeta.source_clips.length
    : 0;
  const source_scene_count = Math.max(
    0,
    Math.min(
      80,
      Math.floor(
        Number(body.source_scene_count) ||
          parentSceneCount ||
          source_clips.length ||
          scene_durations.length,
      ),
    ),
  );
  const selected_media = Array.isArray(body.selected_media)
    ? (body.selected_media as unknown[])
        .filter((item): item is Record<string, unknown> => {
          return Boolean(item && typeof item === "object");
        })
        .map((row, index) => ({
          scene_id: String(row.scene_id || `scene-${index + 1}`).slice(0, 120),
          index: Math.max(0, Math.min(79, Number(row.index) || index)),
          original_index: Math.max(
            0,
            Math.min(79, Number(row.original_index ?? row.index ?? index) || 0),
          ),
          kind: ["video", "photo"].includes(String(row.kind || ""))
            ? String(row.kind)
            : "video",
          provider: String(row.provider || "media").slice(0, 60),
          title: String(row.title || "Media").slice(0, 160),
          thumb: row.thumb ? String(row.thumb).slice(0, 2000) : null,
          preview_url: row.preview_url
            ? String(row.preview_url).slice(0, 2000)
            : null,
          download_url: row.download_url
            ? String(row.download_url).slice(0, 2000)
            : null,
          duration: Math.max(0.5, Math.min(120, Number(row.duration) || 0)),
          width: row.width != null ? Number(row.width) || null : null,
          height: row.height != null ? Number(row.height) || null : null,
        }))
        .filter((item) => item.preview_url || item.download_url)
        .slice(0, 80)
    : [];
  const scene_motions = Array.isArray(body.scene_motions)
    ? (body.scene_motions as unknown[])
        .filter((item): item is Record<string, unknown> => {
          return Boolean(item && typeof item === "object");
        })
        .map((row, index) => ({
          id: String(row.id || `scene-${index + 1}`).slice(0, 120),
          index: Math.max(0, Math.min(79, Number(row.index) || index)),
          original_index: Math.max(
            0,
            Math.min(79, Number(row.original_index ?? row.index ?? index) || 0),
          ),
          motion: String(row.motion || motion || "none").slice(0, 60),
        }))
        .slice(0, 80)
    : [];
  const aspect_ratio = ["9:16", "16:9", "1:1"].includes(
    String(body.aspect_ratio || ""),
  )
    ? String(body.aspect_ratio)
    : String(parentMeta.aspect_ratio || "9:16");

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
    frame_style,
    overlay_text: overlay_text || null,
    caption_text: caption_text || null,
    captions_visible: body.captions_visible !== false,
    caption_scale,
    music_mode,
    music_track_id,
    music_volume,
    keep_original_audio,
    voice_id,
    voice_text: voice_text || null,
    playback_speed,
    flip_h,
    flip_v,
    zoom,
    brightness,
    contrast,
    saturation,
    voice_volume,
    selected_element,
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
    aspect_ratio,
    source_scene_count,
    source_clips,
    selected_media,
    scene_motions,
    scene_durations,
  };

  const { data: job, error } = await supabase
    .from("video_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      title,
      script_text: parent.script_text || voice_text || null,
      description: parent.description || null,
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
