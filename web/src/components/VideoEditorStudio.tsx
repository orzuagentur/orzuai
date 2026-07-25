"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { VideoJob } from "@/lib/types";
import { useToast } from "@/components/ToastNotice";
import { EditorFilmstrip } from "@/components/EditorFilmstrip";
import {
  useCurrentFrameCapture,
  useVideoFrameThumbs,
} from "@/hooks/useVideoFrameThumbs";
import { createClient } from "@/lib/supabase/client";
import {
  EFFECTS,
  FADES,
  LOOK_PACKS,
  MOTIONS,
  SPEEDS,
  SUBTITLE_STYLES,
  TEXT_STYLES,
  TRANSITIONS,
} from "@/lib/editor-catalog";

type Category =
  | "sources"
  | "presets"
  | "clip"
  | "trim"
  | "speed"
  | "transform"
  | "adjust"
  | "filters"
  | "motion"
  | "inout"
  | "transition"
  | "text"
  | "captions"
  | "music"
  | "sound";

type MusicTrack = {
  id: string;
  title: string;
  author: string;
  previewUrl: string | null;
};

type LibraryClip = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
};

type SourceClip = {
  id: string;
  provider?: string;
  kind?: string;
  thumb?: string | null;
  label?: string;
  query?: string;
  color?: string;
};

const ACCENT = "#E8A54B";

const LEFT_NAV: {
  group: string;
  items: { id: Category; label: string; icon: string }[];
}[] = [
  {
    group: "Media",
    items: [
      { id: "sources", label: "Sources", icon: "▣" },
      { id: "clip", label: "Video", icon: "▶" },
      { id: "music", label: "Music", icon: "♪" },
      { id: "text", label: "Text", icon: "T" },
      { id: "captions", label: "Subs", icon: "Aa" },
    ],
  },
  {
    group: "Edit",
    items: [
      { id: "presets", label: "Presets", icon: "★" },
      { id: "trim", label: "Trim", icon: "⟷" },
      { id: "speed", label: "Speed", icon: "⏩" },
      { id: "transform", label: "Flip", icon: "⇄" },
      { id: "adjust", label: "Adjust", icon: "☀" },
    ],
  },
  {
    group: "Look",
    items: [
      { id: "filters", label: "Filters", icon: "◐" },
      { id: "motion", label: "Motion", icon: "↗" },
      { id: "inout", label: "In/Out", icon: "◫" },
      { id: "transition", label: "Trans", icon: "⧉" },
    ],
  },
  {
    group: "Audio",
    items: [{ id: "sound", label: "Voice", icon: "🎤" }],
  },
];

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function parentReturnPath(job: VideoJob): string {
  const meta = job.metadata || {};
  const src = String(meta.source || "").toLowerCase();
  const pipe = String(meta.pipeline || "").toLowerCase();
  const lib = String(meta.library || "").toLowerCase();
  if (
    src === "ai_clipping" ||
    pipe === "ai_clipping" ||
    src === "clipping" ||
    lib === "clipping"
  ) {
    return "/dashboard/clipping";
  }
  return "/dashboard/content";
}

function overlayTextClass(style: (typeof TEXT_STYLES)[number]["id"]) {
  switch (style) {
    case "hook_top":
      return "absolute inset-x-3 top-[14%] text-center";
    case "caption_bottom":
      return "absolute inset-x-3 bottom-[22%] text-center";
    case "box_lower":
      return "absolute inset-x-3 bottom-[18%] text-center";
    case "tiny_credit":
      return "absolute inset-x-3 bottom-[6%] text-center";
    case "mega_title":
      return "absolute inset-x-2 top-1/2 -translate-y-1/2 text-center";
    case "slide_left_title":
      return "absolute left-3 top-1/2 max-w-[70%] -translate-y-1/2 text-left";
    case "slide_right_title":
      return "absolute right-3 top-1/2 max-w-[70%] -translate-y-1/2 text-right";
    case "kinetic_center":
      return "absolute inset-x-2 top-[40%] text-center";
    case "stamp_corner":
      return "absolute left-3 top-[10%] text-left";
    case "cta_bottom":
      return "absolute inset-x-3 bottom-[12%] text-center";
    case "word_slam":
      return "absolute inset-x-2 top-[34%] text-center";
    default:
      return "absolute inset-x-3 top-1/2 -translate-y-1/2 text-center";
  }
}

function overlayTextStyle(style: (typeof TEXT_STYLES)[number]["id"]): CSSProperties {
  const base: CSSProperties = {
    fontWeight: 800,
    textShadow: "0 2px 8px rgba(0,0,0,0.85)",
  };
  switch (style) {
    case "hook_top":
      return { ...base, color: ACCENT, fontSize: "1rem" };
    case "caption_bottom":
      return { ...base, color: "#fff", fontSize: "0.85rem" };
    case "box_lower":
      return {
        ...base,
        color: "#fff",
        fontSize: "0.8rem",
        background: "rgba(0,0,0,0.55)",
        borderRadius: 8,
        padding: "6px 10px",
        display: "inline-block",
      };
    case "tiny_credit":
      return { ...base, color: "rgba(255,255,255,0.75)", fontSize: "0.65rem", fontWeight: 600 };
    case "mega_title":
      return { ...base, color: "#fff", fontSize: "1.35rem", letterSpacing: "-0.02em" };
    case "slide_left_title":
      return { ...base, color: ACCENT, fontSize: "0.95rem" };
    case "slide_right_title":
      return { ...base, color: "#fff", fontSize: "0.95rem" };
    case "kinetic_center":
      return { ...base, color: "#66FFE0", fontSize: "1.15rem", letterSpacing: "-0.01em" };
    case "stamp_corner":
      return { ...base, color: "#FF66AA", fontSize: "0.72rem", textTransform: "uppercase" };
    case "cta_bottom":
      return {
        ...base,
        color: ACCENT,
        fontSize: "0.85rem",
        background: "rgba(0,0,0,0.45)",
        borderRadius: 8,
        padding: "6px 12px",
        display: "inline-block",
      };
    case "word_slam":
      return { ...base, color: "#fff", fontSize: "1.4rem", letterSpacing: "-0.03em" };
    default:
      return { ...base, color: "#fff", fontSize: "1.05rem" };
  }
}

function captionPreviewStyle(
  style: (typeof SUBTITLE_STYLES)[number]["id"],
): CSSProperties {
  const base: CSSProperties = {
    fontWeight: 800,
    fontSize: "0.82rem",
    lineHeight: 1.25,
    textAlign: "center",
  };
  switch (style) {
    case "karaoke_gold":
      return { ...base, color: "#FFD700", textShadow: "0 0 12px rgba(255,215,0,0.5), 0 2px 4px #000" };
    case "box_white":
      return {
        ...base,
        color: "#fff",
        background: "rgba(0,0,0,0.6)",
        borderRadius: 6,
        padding: "4px 10px",
        display: "inline-block",
      };
    case "neon_pink":
      return { ...base, color: "#FF66FF", textShadow: "0 0 10px #FF00AA, 0 2px 4px #000" };
    case "minimal":
      return { ...base, color: "#f0f0f0", fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.6)" };
    case "impact":
      return { ...base, fontSize: "0.95rem", color: "#fff", textShadow: "2px 2px 0 #000, -1px -1px 0 #000" };
    case "soft_shadow":
      return { ...base, color: "#fff", textShadow: "0 3px 8px rgba(0,0,0,0.9)" };
    case "yellow_pop":
      return { ...base, color: "#FFFF00", textShadow: "0 2px 4px #000" };
    case "lower_third":
      return {
        ...base,
        color: "#fff",
        fontSize: "0.72rem",
        background: "rgba(0,0,0,0.75)",
        borderLeft: `3px solid ${ACCENT}`,
        padding: "4px 8px",
        display: "inline-block",
        textAlign: "left" as const,
      };
    case "hook_banner":
      return { ...base, color: ACCENT, fontSize: "0.95rem", textShadow: "0 2px 6px #000" };
    case "cyan_glow":
      return { ...base, color: "#66E0FF", textShadow: "0 0 12px #00AAFF, 0 2px 4px #000" };
    case "fire_orange":
      return { ...base, color: "#FFA500", textShadow: "0 0 10px #FF4500, 0 2px 4px #000" };
    case "lime_pulse":
      return { ...base, color: "#99FF00", textShadow: "0 2px 6px #000" };
    case "comic_pop":
      return { ...base, color: "#fff", textShadow: "3px 3px 0 #FF0000, -1px -1px 0 #000" };
    case "glass_frost":
      return {
        ...base,
        color: "#fff",
        background: "rgba(26,26,46,0.65)",
        backdropFilter: "blur(6px)",
        borderRadius: 8,
        padding: "4px 12px",
        display: "inline-block",
      };
    case "serif_clean":
      return { ...base, color: "#f8f8f8", fontWeight: 500, fontFamily: "Georgia, serif", textShadow: "0 1px 4px #000" };
    case "stack_outline":
      return { ...base, color: "transparent", WebkitTextStroke: "1.5px #fff", textShadow: "none" };
    case "typewriter":
      return { ...base, color: "#e8e8e8", fontWeight: 500, fontFamily: "Courier New, monospace", letterSpacing: "0.04em" };
    case "viral_white":
      return { ...base, color: "#fff", fontSize: "0.95rem", textShadow: "0 0 0 3px #000, 2px 2px 0 #000, -2px -2px 0 #000" };
    case "duotone_sub":
      return { ...base, color: "#FFCC66", textShadow: "0 0 8px #AA4400, 0 2px 4px #000" };
    default:
      return { ...base, color: "#fff", textShadow: "0 2px 4px #000, 0 0 1px #000" };
  }
}

function Chip({
  label,
  active,
  onClick,
  swatch,
  swatchFilter,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  swatch?: string;
  swatchFilter?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5"
      style={{ width: 64 }}
    >
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-[10px] font-bold transition"
        style={{
          border: active ? `2px solid ${ACCENT}` : "2px solid rgba(255,255,255,0.12)",
          background: swatch || (active ? "rgba(232,165,75,0.18)" : "#1a1a1a"),
          color: active ? ACCENT : "rgba(255,255,255,0.85)",
          boxShadow: active ? `0 0 0 1px rgba(232,165,75,0.25)` : undefined,
        }}
      >
        {swatch ? (
          <span
            className="h-full w-full"
            style={{
              background: swatch,
              filter: swatchFilter && swatchFilter !== "none" ? swatchFilter : undefined,
            }}
          />
        ) : (
          label.slice(0, 2).toUpperCase()
        )}
      </span>
      <span
        className="max-w-[64px] truncate text-center text-[10px] font-medium leading-tight"
        style={{ color: active ? ACCENT : "rgba(255,255,255,0.55)" }}
      >
        {label}
      </span>
    </button>
  );
}

export function VideoEditorStudio({ job }: { job: VideoJob }) {
  const router = useRouter();
  const { show: toast, notice } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const meta = (job.metadata || {}) as Record<string, unknown>;
  const initialEffect = (() => {
    const v = String(meta.visual_effect || meta.effect || "cinematic");
    return EFFECTS.some((e) => e.id === v) ? (v as (typeof EFFECTS)[number]["id"]) : "cinematic";
  })();
  const initialSub = (() => {
    const v = String(meta.subtitle_style || "classic");
    return SUBTITLE_STYLES.some((s) => s.id === v)
      ? (v as (typeof SUBTITLE_STYLES)[number]["id"])
      : "classic";
  })();
  const initialTransition = (() => {
    const v = String(meta.preferred_transition || "fade");
    return TRANSITIONS.some((t) => t.id === v)
      ? (v as (typeof TRANSITIONS)[number]["id"])
      : "fade";
  })();

  const [cat, setCat] = useState<Category>("sources");
  const [playing, setPlaying] = useState(false);
  const [loopPreview, setLoopPreview] = useState(true);
  const [effect, setEffect] = useState<(typeof EFFECTS)[number]["id"]>(initialEffect);
  const [motion, setMotion] = useState<(typeof MOTIONS)[number]["id"]>("none");
  const [introFade, setIntroFade] = useState<(typeof FADES)[number]["id"]>("fade");
  const [outroFade, setOutroFade] = useState<(typeof FADES)[number]["id"]>("fadeblack");
  const [transition, setTransition] =
    useState<(typeof TRANSITIONS)[number]["id"]>(initialTransition);
  const [textStyle, setTextStyle] =
    useState<(typeof TEXT_STYLES)[number]["id"]>("bold_center");
  const [subtitleStyle, setSubtitleStyle] =
    useState<(typeof SUBTITLE_STYLES)[number]["id"]>(initialSub);
  const [overlayText, setOverlayText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [musicMode, setMusicMode] = useState<"none" | "auto" | "track">("auto");
  const [musicTrackId, setMusicTrackId] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.45);
  const [musicQuery, setMusicQuery] = useState("soundtrack");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(1.05);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [duration, setDuration] = useState(
    Number(job.duration_seconds) > 0 ? Number(job.duration_seconds) : 30,
  );
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(
    Number(job.duration_seconds) > 0 ? Number(job.duration_seconds) : 30,
  );
  const [current, setCurrent] = useState(0);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [library, setLibrary] = useState<LibraryClip[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [excludedSources, setExcludedSources] = useState<Set<string>>(
    () => new Set(),
  );

  const initialSources = useMemo(() => {
    const raw = meta.source_clips;
    if (!Array.isArray(raw)) return [] as SourceClip[];
    return raw
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x, i) => ({
        id: String(x.id || `src-${i}`),
        provider: x.provider ? String(x.provider) : undefined,
        kind: x.kind ? String(x.kind) : undefined,
        thumb: x.thumb ? String(x.thumb) : null,
        label: x.label ? String(x.label) : x.query ? String(x.query) : `Clip ${i + 1}`,
        query: x.query ? String(x.query) : undefined,
        color: x.color ? String(x.color) : undefined,
      }));
  }, [meta.source_clips]);

  const visibleSources = useMemo(
    () => initialSources.filter((s) => !excludedSources.has(s.id)),
    [initialSources, excludedSources],
  );

  const backHref = useMemo(() => parentReturnPath(job), [job]);
  const previewSrc = `/api/jobs/${job.id}/preview`;
  const effectCss = EFFECTS.find((e) => e.id === effect)?.css || "none";
  const { thumbs, busy: thumbsBusy } = useVideoFrameThumbs(previewSrc, duration, 24);
  const currentFrame = useCurrentFrameCapture(videoRef, current, playing);

  const previewFilter = useMemo(() => {
    const parts: string[] = [];
    if (effectCss && effectCss !== "none") parts.push(effectCss);
    if (Math.abs(brightness) > 0.01) parts.push(`brightness(${1 + brightness})`);
    if (Math.abs(contrast - 1) > 0.01) parts.push(`contrast(${contrast})`);
    if (Math.abs(saturation - 1) > 0.01) parts.push(`saturate(${saturation})`);
    return parts.length ? parts.join(" ") : undefined;
  }, [effectCss, brightness, contrast, saturation]);

  const previewTransform = useMemo(() => {
    const flips: string[] = [];
    if (flipH) flips.push("scaleX(-1)");
    if (flipV) flips.push("scaleY(-1)");
    if (zoom > 1.01) flips.push(`scale(${zoom})`);
    return flips.length ? flips.join(" ") : undefined;
  }, [flipH, flipV, zoom]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  function applyLookPack(pack: (typeof LOOK_PACKS)[number]) {
    setActivePack(pack.id);
    setEffect(pack.effect);
    setMotion(pack.motion);
    setSubtitleStyle(pack.subtitle);
    setTransition(pack.transition);
    setPlaybackSpeed(pack.speed);
    setContrast(pack.contrast);
    setSaturation(pack.saturation);
    setBrightness("brightness" in pack ? Number(pack.brightness) || 0 : 0);
  }

  const loadMusic = useCallback(async (q: string) => {
    setMusicLoading(true);
    const res = await fetch(
      `/api/media/search?type=music&q=${encodeURIComponent(q || "soundtrack")}&page=1`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    setMusicLoading(false);
    if (!res.ok) {
      setTracks([]);
      return;
    }
    setTracks(
      ((data.items || []) as Array<{
        id: string;
        title?: string;
        author?: string;
        previewUrl?: string | null;
      }>).map((t) => ({
        id: String(t.id),
        title: t.title || `Track #${t.id}`,
        author: t.author || "Library",
        previewUrl: t.previewUrl || null,
      })),
    );
  }, []);

  useEffect(() => {
    void loadMusic(musicQuery);
    return () => {
      musicRef.current?.pause();
    };
  }, [loadMusic, musicQuery]);

  useEffect(() => {
    let cancelled = false;
    setLibraryLoading(true);
    const sb = createClient();
    void (async () => {
      const { data, error } = await sb
        .from("video_jobs")
        .select("id,title,thumbnail_url,duration_seconds,status")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(48);
      if (cancelled) return;
      setLibraryLoading(false);
      if (error || !data) {
        setLibrary([]);
        return;
      }
      setLibrary(
        data
          .filter((row) => row.id !== job.id)
          .map((row) => ({
            id: String(row.id),
            title: row.title,
            thumbnail_url: row.thumbnail_url,
            duration_seconds: row.duration_seconds,
          })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  const onLoadedMeta = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (Number.isFinite(d) && d > 0) {
      setDuration(d);
      setTrimEnd((prev) => (prev <= 0 || prev > d ? d : prev));
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function tick() {
      const t = v!.currentTime || 0;
      setCurrent(t);
      if (t >= trimEnd - 0.05) {
        if (loopPreview) {
          v!.currentTime = trimStart;
          setCurrent(trimStart);
          return;
        }
        v!.pause();
        setPlaying(false);
        v!.currentTime = trimStart;
        setCurrent(trimStart);
      }
    }
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [trimEnd, trimStart, loopPreview]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
      return;
    }
    if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
    }
    void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function seekTo(ratio: number) {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const t = Math.max(trimStart, Math.min(trimEnd, ratio * duration));
    v.currentTime = t;
    setCurrent(t);
  }

  function toggleMusicPreview(track: MusicTrack) {
    if (!track.previewUrl) return;
    if (playingMusicId === track.id) {
      musicRef.current?.pause();
      setPlayingMusicId(null);
      return;
    }
    musicRef.current?.pause();
    const audio = new Audio(track.previewUrl);
    audio.volume = musicVolume;
    musicRef.current = audio;
    audio.onended = () => setPlayingMusicId(null);
    void audio.play().then(() => setPlayingMusicId(track.id));
  }

  async function onExport() {
    if (exporting) return;
    if (trimEnd - trimStart < 0.5) {
      toast("Trim range is too short", "error");
      return;
    }
    setExporting(true);
    musicRef.current?.pause();
    videoRef.current?.pause();
    setPlaying(false);

    const res = await fetch("/api/jobs/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_job_id: job.id,
        effect,
        motion,
        intro_fade: introFade,
        outro_fade: outroFade,
        preferred_transition: transition,
        text_style: textStyle,
        subtitle_style: subtitleStyle,
        overlay_text: overlayText.trim() || null,
        caption_text: captionText.trim() || null,
        music_mode: musicMode,
        music_track_id: musicMode === "track" ? musicTrackId || null : null,
        music_volume: musicVolume,
        keep_original_audio: keepOriginal,
        voice_volume: voiceVolume,
        playback_speed: playbackSpeed,
        flip_h: flipH,
        flip_v: flipV,
        zoom,
        brightness,
        contrast,
        saturation,
        trim_start: trimStart,
        trim_end: trimEnd,
        excluded_source_ids: Array.from(excludedSources),
        source_clips: visibleSources,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setExporting(false);
    if (!res.ok) {
      toast(data.error || "Export failed", "error");
      return;
    }
    toast("Export started", "info");
    router.push(backHref);
  }

  function renderDockTools() {
    switch (cat) {
      case "sources":
        return (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="text-[10px] text-white/45">
              Clips & assets AI used in this video. Remove to exclude from future
              remakes, or replace the whole project from library.
            </p>
            {initialSources.length === 0 ? (
              <p className="text-xs text-white/45">
                No source list on this job yet (older renders). New AI videos will
                list every clip here.
              </p>
            ) : (
              <div className="flex max-h-[150px] gap-2 overflow-x-auto pb-1">
                {initialSources.map((src) => {
                  const gone = excludedSources.has(src.id);
                  return (
                    <div
                      key={src.id}
                      className="relative flex w-[92px] shrink-0 flex-col gap-1"
                      style={{ opacity: gone ? 0.35 : 1 }}
                    >
                      <span
                        className="block aspect-[9/16] w-full overflow-hidden rounded-lg border border-white/12 bg-cover bg-center"
                        style={{
                          backgroundColor: src.color
                            ? src.color.startsWith("#")
                              ? src.color
                              : `#${src.color}`
                            : "#111",
                          backgroundImage: src.thumb ? `url(${src.thumb})` : undefined,
                        }}
                      />
                      <span className="truncate text-[10px] text-white/70">
                        {src.label || src.kind || "Clip"}
                      </span>
                      <button
                        type="button"
                        className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70"
                        onClick={() => {
                          setExcludedSources((prev) => {
                            const next = new Set(prev);
                            if (next.has(src.id)) next.delete(src.id);
                            else next.add(src.id);
                            return next;
                          });
                        }}
                      >
                        {gone ? "Restore" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "presets":
        return (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="text-[10px] text-white/45">
              One-tap pro looks — sets filter, motion, captions, speed & color.
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {LOOK_PACKS.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  active={activePack === p.id}
                  onClick={() => applyLookPack(p)}
                  swatch="linear-gradient(135deg,#1a1a1a,#E8A54B 55%,#334155)"
                />
              ))}
            </div>
          </div>
        );

      case "clip":
        return (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="text-[10px] text-white/45">
              Replace this project with another ready video from your library.
            </p>
            <div className="flex max-h-[140px] gap-2 overflow-x-auto pb-1">
              {libraryLoading ? (
                <p className="text-xs text-white/45">Loading library…</p>
              ) : library.length === 0 ? (
                <p className="text-xs text-white/45">No other ready videos</p>
              ) : (
                library.map((clip) => (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/editor/${clip.id}`)}
                    className="flex w-[88px] shrink-0 flex-col gap-1"
                  >
                    <span
                      className="block aspect-[9/16] w-full overflow-hidden rounded-lg border border-white/12 bg-black bg-cover bg-center"
                      style={{
                        backgroundImage: clip.thumbnail_url
                          ? `url(${clip.thumbnail_url})`
                          : undefined,
                      }}
                    />
                    <span className="truncate text-[10px] text-white/70">
                      {clip.title || "Untitled"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        );

      case "speed":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {SPEEDS.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={Math.abs(playbackSpeed - s.value) < 0.01}
                  onClick={() => {
                    setPlaybackSpeed(s.value);
                    setActivePack(null);
                  }}
                />
              ))}
            </div>
            <label className="block space-y-1 text-[10px] text-white/50">
              Custom {playbackSpeed.toFixed(2)}×
              <input
                type="range"
                min={0.25}
                max={2.5}
                step={0.05}
                value={playbackSpeed}
                onChange={(e) => {
                  setPlaybackSpeed(Number(e.target.value));
                  setActivePack(null);
                }}
                className="w-full accent-[#E8A54B]"
              />
            </label>
          </div>
        );

      case "transform":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <Chip label="Flip H" active={flipH} onClick={() => setFlipH((v) => !v)} />
              <Chip label="Flip V" active={flipV} onClick={() => setFlipV((v) => !v)} />
              <Chip
                label="Reset"
                active={!flipH && !flipV && zoom <= 1.01}
                onClick={() => {
                  setFlipH(false);
                  setFlipV(false);
                  setZoom(1);
                }}
              />
            </div>
            <label className="block space-y-1 text-[10px] text-white/50">
              Zoom {Math.round(zoom * 100)}%
              <input
                type="range"
                min={1}
                max={1.8}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#E8A54B]"
              />
            </label>
          </div>
        );

      case "adjust":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3 px-1">
            {(
              [
                {
                  label: "Brightness",
                  value: brightness,
                  min: -0.35,
                  max: 0.35,
                  step: 0.01,
                  onChange: setBrightness,
                  display: `${brightness >= 0 ? "+" : ""}${brightness.toFixed(2)}`,
                },
                {
                  label: "Contrast",
                  value: contrast,
                  min: 0.6,
                  max: 1.6,
                  step: 0.01,
                  onChange: setContrast,
                  display: contrast.toFixed(2),
                },
                {
                  label: "Saturation",
                  value: saturation,
                  min: 0,
                  max: 1.8,
                  step: 0.01,
                  onChange: setSaturation,
                  display: saturation.toFixed(2),
                },
              ] as const
            ).map((row) => (
              <label key={row.label} className="block space-y-1 text-[10px] text-white/50">
                <span className="flex justify-between">
                  <span>{row.label}</span>
                  <span>{row.display}</span>
                </span>
                <input
                  type="range"
                  min={row.min}
                  max={row.max}
                  step={row.step}
                  value={row.value}
                  onChange={(e) => {
                    row.onChange(Number(e.target.value));
                    setActivePack(null);
                  }}
                  className="w-full accent-[#E8A54B]"
                />
              </label>
            ))}
            <button
              type="button"
              className="self-start rounded-lg border border-white/12 px-3 py-1.5 text-[11px] text-white/70"
              onClick={() => {
                setBrightness(0);
                setContrast(1);
                setSaturation(1);
              }}
            >
              Reset color
            </button>
          </div>
        );

      case "trim":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3 px-1">
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] text-white/70"
                onClick={() => seekTo(trimStart / Math.max(duration, 0.01))}
              >
                Go In
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] text-white/70"
                onClick={() => seekTo(trimEnd / Math.max(duration, 0.01))}
              >
                Go Out
              </button>
              <Chip
                label="Loop"
                active={loopPreview}
                onClick={() => setLoopPreview((v) => !v)}
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-white/50">
                <span>Start</span>
                <span>{formatTime(trimStart)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.05}
                value={trimStart}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTrimStart(Math.min(v, trimEnd - 0.5));
                }}
                className="w-full accent-[#E8A54B]"
                aria-label="Trim start"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-white/50">
                <span>End</span>
                <span>{formatTime(trimEnd)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.05}
                value={trimEnd}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTrimEnd(Math.max(v, trimStart + 0.5));
                }}
                className="w-full accent-[#E8A54B]"
                aria-label="Trim end"
              />
            </div>
          </div>
        );

      case "filters":
        return (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {EFFECTS.map((e) => (
              <Chip
                key={e.id}
                label={e.label}
                active={effect === e.id}
                onClick={() => setEffect(e.id)}
                swatch="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
                swatchFilter={e.css}
              />
            ))}
          </div>
        );

      case "motion":
        return (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {MOTIONS.map((m) => (
              <Chip
                key={m.id}
                label={m.label}
                active={motion === m.id}
                onClick={() => setMotion(m.id)}
              />
            ))}
          </div>
        );

      case "inout":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Intro
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {FADES.map((f) => (
                  <Chip
                    key={`in-${f.id}`}
                    label={f.label}
                    active={introFade === f.id}
                    onClick={() => setIntroFade(f.id)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Outro
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {FADES.map((f) => (
                  <Chip
                    key={`out-${f.id}`}
                    label={f.label}
                    active={outroFade === f.id}
                    onClick={() => setOutroFade(f.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case "transition":
        return (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="text-[10px] text-white/45">
              Applied between stitched clips when your source has multiple segments.
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {TRANSITIONS.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  active={transition === t.id}
                  onClick={() => setTransition(t.id)}
                />
              ))}
            </div>
          </div>
        );

      case "text":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <input
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value.slice(0, 120))}
              placeholder="Title / hook…"
              className="w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {TEXT_STYLES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={textStyle === s.id}
                  onClick={() => setTextStyle(s.id)}
                />
              ))}
            </div>
          </div>
        );

      case "captions":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <input
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value.slice(0, 120))}
              placeholder="Caption / subtitle…"
              className="w-full rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {SUBTITLE_STYLES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={subtitleStyle === s.id}
                  onClick={() => setSubtitleStyle(s.id)}
                />
              ))}
            </div>
          </div>
        );

      case "music":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {(
                [
                  { id: "none" as const, label: "Off" },
                  { id: "auto" as const, label: "Auto" },
                  { id: "track" as const, label: "Pick" },
                ] as const
              ).map((m) => (
                <Chip
                  key={m.id}
                  label={m.label}
                  active={musicMode === m.id}
                  onClick={() => setMusicMode(m.id)}
                />
              ))}
            </div>
            {musicMode !== "none" && (
              <label className="block space-y-1 text-[10px] text-white/50">
                Volume
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={musicVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMusicVolume(v);
                    if (musicRef.current) musicRef.current.volume = v;
                  }}
                  className="w-full accent-[#E8A54B]"
                />
              </label>
            )}
            {musicMode === "track" && (
              <>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const q = String(fd.get("q") || "").trim() || "soundtrack";
                    setMusicQuery(q);
                  }}
                >
                  <input
                    name="q"
                    defaultValue={musicQuery}
                    placeholder="Search music…"
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-black"
                    style={{ background: ACCENT }}
                  >
                    Search
                  </button>
                </form>
                <div className="max-h-[120px] space-y-1 overflow-y-auto">
                  {musicLoading ? (
                    <p className="text-xs text-white/45">Loading…</p>
                  ) : tracks.length === 0 ? (
                    <p className="text-xs text-white/45">No tracks found</p>
                  ) : (
                    tracks.map((t) => {
                      const on = musicTrackId === t.id;
                      const playingTrack = playingMusicId === t.id;
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                          style={{
                            background: on ? "rgba(232,165,75,0.12)" : "transparent",
                            border: `1px solid ${on ? "rgba(232,165,75,0.45)" : "transparent"}`,
                          }}
                        >
                          <button
                            type="button"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white"
                            disabled={!t.previewUrl}
                            onClick={() => toggleMusicPreview(t)}
                          >
                            {playingTrack ? "■" : "▶"}
                          </button>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setMusicTrackId(t.id)}
                          >
                            <span className="block truncate text-xs font-medium text-white">
                              {t.title}
                            </span>
                            <span className="block truncate text-[10px] text-white/45">
                              {t.author}
                            </span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        );

      case "sound":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <Chip
                label="Keep VO"
                active={keepOriginal}
                onClick={() => setKeepOriginal(true)}
              />
              <Chip
                label="Mute VO"
                active={!keepOriginal}
                onClick={() => setKeepOriginal(false)}
              />
            </div>
            {keepOriginal && (
              <label className="block space-y-1 text-[10px] text-white/50">
                Voice volume {voiceVolume.toFixed(2)}
                <input
                  type="range"
                  min={0.2}
                  max={1.4}
                  step={0.01}
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full accent-[#E8A54B]"
                />
              </label>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col text-white"
      style={{ background: "#0a0a0a" }}
    >
      {notice}

      <header
        className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3"
        style={{ background: "#0a0a0a" }}
      >
        <Link
          href={backHref}
          className="shrink-0 text-sm font-medium text-white/60 transition hover:text-white"
        >
          ← Back
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold">
          {job.title || "Edit"}
        </h1>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void onExport()}
          className="shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-black transition disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          {exporting ? "…" : "Export"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left icon rail */}
        <nav
          className="flex w-[72px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 py-2"
          style={{ background: "#0c0c0c" }}
          aria-label="Editor tools"
        >
          {LEFT_NAV.map((group) => (
            <div key={group.group} className="mb-1">
              <p className="mb-1 px-1 text-center text-[8px] font-semibold uppercase tracking-wider text-white/30">
                {group.group}
              </p>
              {group.items.map((item) => {
                const on = cat === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCat(item.id)}
                    className="mx-auto mb-0.5 flex w-[64px] flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition"
                    style={{
                      background: on ? "rgba(232,165,75,0.16)" : "transparent",
                      color: on ? ACCENT : "rgba(255,255,255,0.55)",
                    }}
                    title={item.label}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="max-w-full truncate text-[9px] font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Main preview */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
                <div
                  className="relative w-full max-w-[300px] overflow-hidden rounded-xl bg-black shadow-2xl"
                  style={{ aspectRatio: "9/16" }}
                >
                  <video
                    ref={videoRef}
                    src={previewSrc}
                    className="h-full w-full object-cover"
                    style={{
                      filter: previewFilter,
                      transform: previewTransform,
                    }}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={onLoadedMeta}
                    onClick={togglePlay}
                  />

                  {effect === "vignette" && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ boxShadow: "inset 0 0 60px 20px rgba(0,0,0,0.55)" }}
                    />
                  )}

                  {overlayText.trim() && (
                    <div className={`pointer-events-none ${overlayTextClass(textStyle)}`}>
                      <span style={overlayTextStyle(textStyle)}>
                        {overlayText.trim().slice(0, 80)}
                      </span>
                    </div>
                  )}

                  {captionText.trim() && (
                    <div className="pointer-events-none absolute inset-x-3 bottom-[10%] text-center">
                      <span style={captionPreviewStyle(subtitleStyle)}>
                        {captionText.trim().slice(0, 80)}
                      </span>
                    </div>
                  )}

                  {!playing && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/35"
                      aria-label="Play"
                    >
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                      >
                        ▶
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right inspector */}
            <aside
              className="flex max-h-[38vh] w-full shrink-0 flex-col border-t border-white/10 lg:max-h-none lg:w-[280px] lg:border-l lg:border-t-0"
              style={{ background: "#0e0e0e" }}
            >
              <div className="border-b border-white/8 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Now
                </p>
                <div className="mt-2 flex gap-3">
                  <div
                    className="h-20 w-12 shrink-0 overflow-hidden rounded-md border border-[#E8A54B]/60 bg-black bg-cover bg-center"
                    style={{
                      backgroundImage: currentFrame
                        ? `url(${currentFrame})`
                        : undefined,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {job.title || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {formatTime(current)} / {formatTime(duration)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {EFFECTS.find((e) => e.id === effect)?.label} ·{" "}
                      {SUBTITLE_STYLES.find((s) => s.id === subtitleStyle)?.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Frames
                </p>
                <div className="mb-4 grid grid-cols-3 gap-1.5">
                  {(thumbs.length ? thumbs : Array.from({ length: 9 }, () => ""))
                    .slice(0, 9)
                    .map((src, i) => (
                      <button
                        key={`rf-${i}`}
                        type="button"
                        className="aspect-[9/16] overflow-hidden rounded-md border border-white/10 bg-black/60 bg-cover bg-center"
                        style={{ backgroundImage: src ? `url(${src})` : undefined }}
                        onClick={() => {
                          if (!(duration > 0)) return;
                          const n = Math.max(9, Math.min(thumbs.length || 9, 9));
                          seekTo((i + 0.5) / n);
                        }}
                        aria-label={`Jump to frame ${i + 1}`}
                      />
                    ))}
                </div>

                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Replace video
                </p>
                <div className="space-y-2">
                  {libraryLoading ? (
                    <p className="text-xs text-white/45">Loading…</p>
                  ) : library.length === 0 ? (
                    <p className="text-xs text-white/45">No other ready videos</p>
                  ) : (
                    library.slice(0, 10).map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => router.push(`/dashboard/editor/${clip.id}`)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1.5 text-left transition hover:border-white/20"
                      >
                        <span
                          className="h-12 w-9 shrink-0 rounded bg-black bg-cover bg-center"
                          style={{
                            backgroundImage: clip.thumbnail_url
                              ? `url(${clip.thumbnail_url})`
                              : undefined,
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-white">
                            {clip.title || "Untitled"}
                          </span>
                          <span className="block text-[10px] text-white/40">
                            {formatTime(Number(clip.duration_seconds) || 0)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          {/* Bottom: selected tool results + filmstrip */}
          <div
            className="shrink-0 border-t border-white/10"
            style={{ background: "#111" }}
          >
            <div className="border-b border-white/8 px-4 py-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {LEFT_NAV.flatMap((g) => g.items).find((i) => i.id === cat)?.label ||
                  "Tools"}
              </p>
              <div className="min-h-[110px]">{renderDockTools()}</div>
            </div>
            <div className="px-4 py-3 lg:px-6">
              <EditorFilmstrip
                duration={duration}
                current={current}
                trimStart={trimStart}
                trimEnd={trimEnd}
                thumbs={thumbs}
                busy={thumbsBusy}
                currentFrame={currentFrame}
                onSeek={seekTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
