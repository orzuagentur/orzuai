import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveYoutubeChannel } from "@/lib/youtube-channels";

const DEFAULTS = {
  clip_count: 5,
  music_mood: "motivational epic",
  music_volume_hook: 0.88,
  music_volume_body: 0.58,
  voice_volume: 1.05,
  transitions_enabled: true,
  motions_enabled: true,
  punch_first_clip: true,
  enabled_transitions: [
    "fade",
    "dissolve",
    "fadeblack",
    "fadewhite",
    "fadegrays",
    "wipeleft",
    "wiperight",
    "wipeup",
    "wipedown",
    "slideleft",
    "slideright",
    "slideup",
    "slidedown",
    "smoothleft",
    "smoothright",
    "smoothup",
    "smoothdown",
    "circleopen",
    "circleclose",
    "circlecrop",
    "rectcrop",
    "radial",
    "pixelize",
    "distance",
    "diagtl",
    "diagtr",
    "diagbl",
    "diagbr",
    "vertopen",
    "horzopen",
    "hblur",
    "zoomin",
    "squeezeh",
    "squeezev",
    "hlslice",
    "hrslice",
  ],
  enabled_motions: [
    "punch_in",
    "slow_push",
    "rise",
    "drift_left",
    "drift_right",
    "snap_zoom",
    "pull_out",
    "tilt_up",
    "tilt_down",
    "handheld",
    "orbit",
    "crash_zoom",
    "whip_left",
    "whip_right",
    "breathe",
    "reveal_up",
    "zoom_out_punch",
    "vertigo",
    "shake_hit",
    "slide_diag",
    "whip_zoom",
    "parallax_drift",
    "snap_in",
    "float_rise",
    "orbit_soft",
    "slow_dolly",
    "impact_shake",
    "peek_left",
    "peek_right",
  ],
  avoid_reuse_days: 60,
};

function normalizeMotionSettings(body: Record<string, unknown>) {
  const raw = Array.isArray(body.enabled_motions)
    ? body.enabled_motions.map(String).filter(Boolean)
    : DEFAULTS.enabled_motions;
  const explicitNone = raw.includes("none");
  const enabled = raw.filter((id) => id !== "none");

  return {
    motions_enabled: body.motions_enabled !== false && !(explicitNone && !enabled.length),
    enabled_motions: enabled.length ? enabled : DEFAULTS.enabled_motions,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveYoutubeChannel(user.id);
  let query = supabase
    .from("montage_settings")
    .select("*")
    .eq("user_id", user.id);
  query = active?.channel_id
    ? query.eq("youtube_channel_id", active.channel_id)
    : query.is("youtube_channel_id", null);
  const { data } = await query.maybeSingle();

  return NextResponse.json({
    settings: data || {
      user_id: user.id,
      youtube_channel_id: active?.channel_id || null,
      ...DEFAULTS,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveYoutubeChannel(user.id);
  const body = await request.json();
  const motionSettings = normalizeMotionSettings(body);
  const payload = {
    user_id: user.id,
    youtube_channel_id: active?.channel_id || null,
    clip_count: Math.min(8, Math.max(3, Number(body.clip_count) || 5)),
    music_mood: String(body.music_mood || "motivational epic"),
    music_volume_hook: Math.min(
      1.2,
      Math.max(0.3, Number(body.music_volume_hook) || 0.88),
    ),
    music_volume_body: Math.min(
      1.0,
      Math.max(0.2, Number(body.music_volume_body) || 0.58),
    ),
    voice_volume: Math.min(1.4, Math.max(0.7, Number(body.voice_volume) || 1.05)),
    transitions_enabled: body.transitions_enabled !== false,
    motions_enabled: motionSettings.motions_enabled,
    punch_first_clip: body.punch_first_clip !== false,
    enabled_transitions: Array.isArray(body.enabled_transitions)
      ? body.enabled_transitions.map(String)
      : DEFAULTS.enabled_transitions,
    enabled_motions: motionSettings.enabled_motions,
    avoid_reuse_days: Math.min(365, Math.max(7, Number(body.avoid_reuse_days) || 60)),
  };

  let existingQuery = supabase
    .from("montage_settings")
    .select("id")
    .eq("user_id", user.id);
  existingQuery = active?.channel_id
    ? existingQuery.eq("youtube_channel_id", active.channel_id)
    : existingQuery.is("youtube_channel_id", null);
  const { data: existing, error: readError } = await existingQuery.maybeSingle();
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const { error } = existing?.id
    ? await supabase.from("montage_settings").update(payload).eq("id", existing.id)
    : await supabase.from("montage_settings").insert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, settings: payload });
}
