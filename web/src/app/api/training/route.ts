import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveYoutubeChannel } from "@/lib/youtube-channels";
import { trainingRequiredComplete } from "@/lib/training-required";
import { EFFECT_IDS, SUBTITLE_STYLE_IDS, TRANSITION_IDS } from "@/lib/editor-catalog";
import {
  clampVideosPerDay,
  defaultTimesForCount,
  padScheduleTimes,
} from "@/lib/publish-schedule";
import type { AiTraining } from "@/lib/types";

function normalizeSubtitleStyle(raw: string): string {
  const v = String(raw || "").trim();
  if (SUBTITLE_STYLE_IDS.has(v)) return v;
  if (v === "karaoke_bold" || v === "karaoke") return "karaoke_gold";
  return "classic";
}

function normalizeVisualEffect(raw: string): string {
  const v = String(raw || "").trim() || "cinematic";
  return EFFECT_IDS.has(v) ? v : "cinematic";
}

function normalizeTransition(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  return TRANSITION_IDS.has(v) ? v : "";
}

function normalizeMontagePace(raw: string): string {
  const v = String(raw || "").trim().toLowerCase() || "medium";
  if (["viral", "fast", "medium", "cinematic"].includes(v)) return v;
  return "medium";
}

function normalizeVideoFormat(raw: string): string {
  const v = raw.trim().toLowerCase() || "shorts";
  if (v === "video" || v === "long" || v === "longform" || v === "youtube_video") {
    return "video";
  }
  if (v === "simple" || v === "simple_video") return "simple";
  return "shorts";
}

function clampTrainingDuration(seconds: number, format: string): number {
  const fmt = normalizeVideoFormat(format);
  const n = Number.isFinite(seconds) ? Math.round(seconds) : 45;
  if (fmt === "video") return Math.min(600, Math.max(90, n));
  if (fmt === "simple") return Math.min(300, Math.max(60, n));
  return Math.min(59, Math.max(15, n));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveYoutubeChannel(user.id);
  if (!active?.channel_id) {
    return NextResponse.json(
      { error: "Select an active YouTube channel first" },
      { status: 400 },
    );
  }

  const body = await request.json();

  const formLike: AiTraining = {
    niche: String(body.niche || "").trim(),
    content_type: String(body.content_type || "").trim(),
    style_prompt: String(body.style_prompt || "").trim(),
    tone: String(body.tone || "").trim(),
    language: String(body.language || "").trim(),
    target_audience: String(body.target_audience || "").trim(),
    hook_style: String(body.hook_style || "").trim(),
    cta: String(body.cta || "").trim(),
    pexels_query: String(body.pexels_query || "").trim(),
    music_mood: String(body.music_mood || "").trim(),
    music_group: String(
      body.music_group || body.music_prefs?.active_group_id || "",
    ).trim(),
    music_prefs:
      body.music_prefs && typeof body.music_prefs === "object"
        ? body.music_prefs
        : undefined,
    voice_id: String(body.voice_id || "").trim(),
    subtitle_style: normalizeSubtitleStyle(String(body.subtitle_style || "classic")),
    visual_effect: normalizeVisualEffect(String(body.visual_effect || "cinematic")),
    preferred_transition: normalizeTransition(String(body.preferred_transition || "")),
    montage_pace: normalizeMontagePace(String(body.montage_pace || "medium")),
    flash_cuts: Boolean(body.flash_cuts),
    duration_seconds: clampTrainingDuration(
      Number(body.duration_seconds) || 45,
      String(body.video_format || "shorts"),
    ),
    video_format: normalizeVideoFormat(String(body.video_format || "shorts")),
    video_style: String(body.video_style || "").trim(),
    reply_comments_enabled: Boolean(body.reply_comments_enabled),
    reply_languages: String(body.reply_languages || "auto").trim(),
    reply_style_prompt: String(body.reply_style_prompt || "").trim(),
    learning_enabled: body.learning_enabled !== false,
    brand_rules: String(body.brand_rules || "").trim(),
    is_trained: false,
  };

  if (!trainingRequiredComplete(formLike)) {
    return NextResponse.json(
      {
        error:
          "Fill required fields first: Language, Voice, and Niche",
      },
      { status: 400 },
    );
  }

  const enableAi = body.enable_ai === true;

  const payload = {
    user_id: user.id,
    youtube_channel_id: active.channel_id,
    niche: formLike.niche,
    content_type: formLike.content_type || "",
    style_prompt: formLike.style_prompt,
    tone: formLike.tone || "",
    language: formLike.language,
    target_audience: formLike.target_audience || "",
    hook_style: formLike.hook_style || "",
    cta: formLike.cta || "",
    // Empty optional → empty string; worker skips empties (no fake English defaults)
    pexels_query: formLike.pexels_query || "",
    music_mood: formLike.music_mood || "",
    music_group: String(body.music_group || body.music_prefs?.active_group_id || "").trim(),
    music_volume: Math.min(
      1,
      Math.max(0.15, Number(body.music_volume ?? body.music_prefs?.volume ?? 0.58) || 0.58),
    ),
    voice_volume: Math.min(
      1.4,
      Math.max(
        0.5,
        Number(body.voice_volume ?? body.music_prefs?.voice_volume ?? 1.05) ||
          1.05,
      ),
    ),
    music_prefs:
      body.music_prefs && typeof body.music_prefs === "object"
        ? body.music_prefs
        : {},
    voice_id: formLike.voice_id,
    subtitle_style: normalizeSubtitleStyle(formLike.subtitle_style || "classic"),
    visual_effect: normalizeVisualEffect(
      String(body.visual_effect || formLike.visual_effect || "cinematic"),
    ),
    preferred_transition: normalizeTransition(
      String(body.preferred_transition ?? formLike.preferred_transition ?? ""),
    ),
    montage_pace: normalizeMontagePace(
      String(body.montage_pace || formLike.montage_pace || "medium"),
    ),
    flash_cuts: Boolean(
      body.flash_cuts ?? formLike.flash_cuts ?? false,
    ),
    duration_seconds: clampTrainingDuration(
      formLike.duration_seconds,
      formLike.video_format,
    ),
    video_format: normalizeVideoFormat(formLike.video_format || "shorts"),
    video_style: formLike.video_style || "",
    reply_comments_enabled: formLike.reply_comments_enabled,
    reply_languages: formLike.reply_languages,
    reply_style_prompt: formLike.reply_style_prompt || "",
    learning_enabled: formLike.learning_enabled,
    brand_rules: formLike.brand_rules || "",
    is_trained: true,
  };

  const montageLook = {
    visual_effect: payload.visual_effect,
    preferred_transition: payload.preferred_transition,
    montage_pace: payload.montage_pace,
    flash_cuts: payload.flash_cuts,
  };
  // Always mirror into music_prefs so worker works even before DB migration
  const prefsObj =
    payload.music_prefs && typeof payload.music_prefs === "object"
      ? { ...(payload.music_prefs as Record<string, unknown>) }
      : {};
  prefsObj.montage_look = montageLook;
  payload.music_prefs = prefsObj;

  const { data: existing } = await supabase
    .from("ai_training")
    .select("id")
    .eq("user_id", user.id)
    .eq("youtube_channel_id", active.channel_id)
    .maybeSingle();

  async function writePayload(body: Record<string, unknown>) {
    if (existing?.id) {
      return supabase.from("ai_training").update(body).eq("id", existing.id);
    }
    return supabase.from("ai_training").insert(body);
  }

  let { error } = await writePayload(payload);
  if (error && /visual_effect|preferred_transition|montage_pace|flash_cuts/i.test(error.message)) {
    const legacy: Record<string, unknown> = { ...payload };
    delete legacy.visual_effect;
    delete legacy.preferred_transition;
    delete legacy.montage_pace;
    delete legacy.flash_cuts;
    ({ error } = await writePayload(legacy));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // First-time "Enable AI content" flow — turn schedule on after required setup
  if (enableAi) {
    const { data: sched } = await supabase
      .from("publish_schedules")
      .select("id, times, videos_per_day, mode, weekdays, custom_dates, timezone")
      .eq("user_id", user.id)
      .eq("youtube_channel_id", active.channel_id)
      .maybeSingle();

    const scheduleVideosPerDay = clampVideosPerDay(sched?.videos_per_day || 2);
    const scheduleRow = {
      user_id: user.id,
      youtube_channel_id: active.channel_id,
      enabled: true,
      mode: sched?.mode || "daily",
      videos_per_day: scheduleVideosPerDay,
      times: padScheduleTimes(
        scheduleVideosPerDay,
        sched?.times || defaultTimesForCount(scheduleVideosPerDay),
      ),
      weekdays: sched?.weekdays || [1, 2, 3, 4, 5, 6, 7],
      custom_dates: sched?.custom_dates || [],
      timezone: sched?.timezone || "Europe/Berlin",
    };

    if (sched?.id) {
      await supabase
        .from("publish_schedules")
        .update({ enabled: true })
        .eq("id", sched.id);
    } else {
      await supabase.from("publish_schedules").insert(scheduleRow);
    }

    await supabase
      .from("profiles")
      .update({
        daily_videos_enabled: true,
        videos_per_day: scheduleRow.videos_per_day,
      })
      .eq("id", user.id);
  }

  return NextResponse.json({
    ok: true,
    youtube_channel_id: active.channel_id,
    ai_enabled: enableAi,
  });
}
