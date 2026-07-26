"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VideoJob } from "@/lib/types";
import { CardMenu, CardMenuSlot } from "@/components/CardMenu";
import {
  QUEUE_STATUSES,
  jobProgressPercent,
  statusColor,
} from "@/lib/job-status";
import { useToast } from "@/components/ToastNotice";
import { clippingSourcePath, MEDIA_BUCKET } from "@/lib/storage";
import { VoicePicker } from "@/components/VoicePicker";
import { SUBTITLE_STYLES, EFFECTS, TRANSITIONS, LOOK_PACKS, MOTIONS } from "@/lib/editor-catalog";
import {
  SubtitleStyleCard,
  type SubtitleStyleId,
} from "@/components/SubtitleStylePicker";
import {
  VIDEO_STYLE_LOOK,
  VIDEO_STYLE_PRESETS,
  MONTAGE_PACE_PRESETS,
} from "@/lib/training-presets";
import { useFeatureLocked } from "@/lib/product-locks-client";

const MONTAGE_STYLE_OPTIONS = [
  { value: "", label: "Auto" },
  ...VIDEO_STYLE_PRESETS,
] as const;

const ASPECTS = [
  { id: "9:16", label: "9:16", hintKey: "aspectShorts" as const },
  { id: "16:9", label: "16:9", hintKey: "aspectLandscape" as const },
  { id: "1:1", label: "1:1", hintKey: "aspectSquare" as const },
] as const;

const DURATIONS = [
  { id: 15, label: "15s" },
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 60, label: "60s" },
] as const;

const MAX_SOURCES = 6;
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — matches storage bucket for clipping sources
const MAX_MB = Math.round(MAX_BYTES / (1024 * 1024));

type Aspect = (typeof ASPECTS)[number]["id"];

type ClipSource = {
  id: string;
  kind: "device" | "media";
  title: string;
  previewUrl: string | null;
  file?: File;
  mediaId?: string;
  provider?: string;
  downloadUrl?: string | null;
  storagePath?: string | null;
  storageBucket?: string | null;
};

function isClippingJob(job: VideoJob) {
  const src = String(job.metadata?.source || "").toLowerCase();
  const pipe = String(job.metadata?.pipeline || "").toLowerCase();
  if (src === "reedit" || pipe === "reedit") {
    return String(job.metadata?.library || "") === "clipping";
  }
  return src === "ai_clipping" || pipe === "ai_clipping" || src === "clipping";
}

function uid() {
  return crypto.randomUUID();
}

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

async function downloadVideo(jobId: string, filename: string) {
  try {
    const res = await fetch(`/api/jobs/${jobId}/preview?download=1`);
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(`/api/jobs/${jobId}/preview?download=1`, "_blank", "noopener,noreferrer");
  }
}

function Toggle({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-center transition sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5"
      style={{
        borderColor: on ? "rgba(232,165,75,0.5)" : "var(--line)",
        background: on ? "rgba(232,165,75,0.1)" : "rgba(255,255,255,0.02)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold sm:h-5 sm:w-5 sm:rounded-md sm:text-[11px]"
        style={{
          borderColor: on ? "var(--accent)" : "var(--line)",
          background: on ? "var(--accent)" : "transparent",
          color: on ? "#1a1208" : "var(--muted)",
        }}
        aria-hidden
      >
        {on ? "✓" : ""}
      </span>
      <span className="truncate text-[11px] font-semibold sm:text-sm">
        {label}
      </span>
    </button>
  );
}

export function AIClippingStudio({ initialJobs }: { initialJobs: VideoJob[] }) {
  const t = useTranslations("studio.clipping");
  const ts = useTranslations("studio.common");
  const tStatus = useTranslations("studio.status");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabRaw = searchParams.get("tab");
  const tab: "create" | "clips" =
    tabRaw === "clips" || tabRaw === "create" ? tabRaw : "create";
  const fileRef = useRef<HTMLInputElement>(null);
  const editorLocked = useFeatureLocked("video_editor");

  function clipStatusLabel(status: string): string {
    switch (status) {
      case "generating_script":
        return tStatus("analyzing");
      case "generating_voice":
        return tStatus("captions");
      case "fetching_media":
        return tStatus("music");
      case "editing":
        return tStatus("cutting");
      case "uploading":
        return tStatus("saving");
      case "queued":
      case "ready":
      case "published":
      case "failed":
        return tStatus(status);
      default:
        return status;
    }
  }
  const [jobs, setJobs] = useState(() => initialJobs.filter(isClippingJob));
  const [sources, setSources] = useState<ClipSource[]>([]);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [duration, setDuration] = useState(30);
  const [useVoice, setUseVoice] = useState(true);
  const [voiceId, setVoiceId] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [addMusic, setAddMusic] = useState(true);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [subtitleStyle, setSubtitleStyle] =
    useState<SubtitleStyleId>("classic");
  const [subsOpen, setSubsOpen] = useState(false);
  const [videoStyle, setVideoStyle] = useState("");
  const [visualEffect, setVisualEffect] = useState("");
  const [preferredTransition, setPreferredTransition] = useState("");
  const [preferredMotion, setPreferredMotion] = useState("");
  const [montagePace, setMontagePace] = useState("");
  const [viralityMode, setViralityMode] = useState(false);
  const [styleFlashCuts, setStyleFlashCuts] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [paceOpen, setPaceOpen] = useState(false);
  const [motionOpen, setMotionOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const [viralityOpen, setViralityOpen] = useState(false);
  const [musicTrackId, setMusicTrackId] = useState("");
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicTracks, setMusicTracks] = useState<
    Array<{
      id: string;
      name: string;
      artist: string;
      previewUrl: string | null;
    }>
  >([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicPlayingId, setMusicPlayingId] = useState<string | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const [instructions, setInstructions] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [watchSource, setWatchSource] = useState<ClipSource | null>(null);
  const { show: toast, notice } = useToast();

  const activeJobs = useMemo(
    () => jobs.filter((j) => QUEUE_STATUSES.has(j.status)),
    [jobs],
  );

  const refreshJobs = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("video_jobs")
      .select(
        "id,status,title,script_text,description,youtube_url,youtube_video_id,error_message,scheduled_for,created_at,completed_at,thumbnail_url,preview_url,view_count,like_count,comment_count,duration_seconds,storage_path,storage_bucket,metadata",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);
    if (data) setJobs((data as VideoJob[]).filter(isClippingJob));
  }, []);

  useEffect(() => {
    setJobs(initialJobs.filter(isClippingJob));
  }, [initialJobs]);

  useEffect(() => {
    if (!addMusic) return;
    let cancelled = false;
    setMusicLoading(true);
    void (async () => {
      // Main shared platform music library (same catalog as AI Training)
      const res = await fetch("/api/music/group", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setMusicLoading(false);
      if (!res.ok) {
        setMusicTracks([]);
        return;
      }
      const tracks = (
        (data.tracks || []) as Array<{
          id: string;
          name?: string;
          artist?: string | null;
          previewUrl?: string | null;
        }>
      ).map((track) => ({
        id: String(track.id),
        name: track.name || ts("track"),
        artist: track.artist || ts("library"),
        previewUrl: track.previewUrl || null,
      }));
      setMusicTracks(tracks);
    })();
    return () => {
      cancelled = true;
    };
  }, [addMusic, ts]);

  useEffect(() => {
    return () => {
      musicAudioRef.current?.pause();
    };
  }, []);

  function toggleMusicPreview(track: {
    id: string;
    previewUrl: string | null;
  }) {
    if (!track.previewUrl) return;
    if (musicPlayingId === track.id) {
      musicAudioRef.current?.pause();
      setMusicPlayingId(null);
      return;
    }
    musicAudioRef.current?.pause();
    const audio = new Audio(track.previewUrl);
    musicAudioRef.current = audio;
    audio.onended = () => setMusicPlayingId(null);
    void audio.play().then(() => setMusicPlayingId(track.id));
  }

  useEffect(() => {
    if (activeJobs.length === 0) return;
    const t = window.setInterval(() => void refreshJobs(), 2500);
    return () => window.clearInterval(t);
  }, [activeJobs.length, refreshJobs]);

  useEffect(() => {
    return () => {
      sources.forEach((s) => {
        if (s.kind === "device" && s.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addDeviceFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const room = MAX_SOURCES - sources.length;
    if (room <= 0) {
      toast(`Maximum ${MAX_SOURCES} videos`, "error");
      return;
    }
    const next: ClipSource[] = [];
    for (const file of list.slice(0, room)) {
      const name = file.name.toLowerCase();
      if (
        !file.type.includes("video") &&
        !name.endsWith(".mp4") &&
        !name.endsWith(".mov") &&
        !name.endsWith(".webm")
      ) {
        toast(`${file.name}: use MP4 / MOV / WebM`, "error");
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast(
          `${file.name}: ${formatMb(file.size)} MB â€” max is ${MAX_MB} MB`,
          "error",
        );
        continue;
      }
      next.push({
        id: uid(),
        kind: "device",
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        previewUrl: URL.createObjectURL(file),
        file,
      });
    }
    if (next.length) setSources((prev) => [...prev, ...next]);
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addDeviceFiles(e.target.files);
    e.target.value = "";
  }

  function removeSource(id: string) {
    setSources((prev) => {
      const hit = prev.find((s) => s.id === id);
      if (hit?.kind === "device" && hit.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(hit.previewUrl);
      }
      return prev.filter((s) => s.id !== id);
    });
  }

  async function startClip() {
    if (sources.length === 0) {
      toast(t("addAtLeastOne"), "error");
      return;
    }
    setCreating(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(ts("signInRequired"));

      const jobId = crypto.randomUUID();
      const payloadSources: Array<Record<string, unknown>> = [];

      for (let i = 0; i < sources.length; i++) {
        const s = sources[i];
        if (s.kind === "device" && s.file) {
          const path = clippingSourcePath(user.id, jobId, i);
          const contentType = s.file.type || "video/mp4";
          const presignRes = await fetch("/api/storage/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: path,
              contentType,
              contentLength: s.file.size,
            }),
          });
          const presign = await presignRes.json().catch(() => ({}));
          if (!presignRes.ok) {
            throw new Error(presign.error || "R2 presign failed");
          }
          const putRes = await fetch(presign.uploadUrl as string, {
            method: "PUT",
            body: s.file,
            headers: { "Content-Type": contentType },
          });
          if (!putRes.ok) {
            throw new Error(`R2 upload failed (${putRes.status})`);
          }
          payloadSources.push({
            kind: "device",
            title: s.title,
            storage_path: path,
            storage_bucket: (presign.bucket as string) || MEDIA_BUCKET,
            url: presign.publicUrl as string,
          });
        } else if (s.kind === "media") {
          payloadSources.push({
            kind: "media",
            title: s.title,
            media_id: s.mediaId,
            provider: "library",
            download_url: s.downloadUrl,
            url: s.downloadUrl,
          });
        }
      }

      const res = await fetch("/api/clipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          sources: payloadSources,
          aspect_ratio: aspect,
          duration_seconds: duration,
          use_voice: useVoice,
          voice_id: useVoice ? voiceId || null : null,
          add_music: addMusic,
          music_group: null,
          music_track_id: addMusic ? musicTrackId || null : null,
          add_subtitles: addSubtitles,
          subtitle_style: addSubtitles ? subtitleStyle : null,
          video_style: videoStyle || null,
          visual_effect: visualEffect || null,
          preferred_transition: preferredTransition || null,
          preferred_motion: preferredMotion || null,
          montage_pace: montagePace || null,
          virality_mode: viralityMode,
          flash_cuts: viralityMode || styleFlashCuts,
          instructions: instructions.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("failedStartClipping"));

      sources.forEach((s) => {
        if (s.kind === "device" && s.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
      setSources([]);
      setInstructions("");
      router.replace("/dashboard/clipping?tab=clips", { scroll: false });
      toast(t("clipQueued"), "info");
      await refreshJobs();
    } catch (err) {
      toast(err instanceof Error ? err.message : ts("failedToStart"), "error");
    } finally {
      setCreating(false);
    }
  }

  async function removeJob(jobId: string) {
    if (!confirm(t("removeClip"))) return;
    setBusyId(jobId);
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast(data.error || ts("failedToDelete"), "error");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    toast(t("clipDeleted"));
  }

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 pb-24">
      {notice}

      <header className="rise hidden sm:block">
        <h1
          className="font-[family-name:var(--font-syne)] text-3xl tracking-tight sm:text-4xl"
          style={{ fontWeight: 800 }}
        >
          {t("title")}
        </h1>
      </header>

      {tab === "create" && (
        <section className="rise-delay">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            className="hidden"
            multiple
            onChange={onFileInput}
          />

          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
            {/* Settings — below videos on mobile */}
            <div className="order-2 min-w-0 space-y-4 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-3 sm:order-1 sm:space-y-5 sm:p-5">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:mb-2">
                  {t("format")}
                </p>
                <p className="mb-1.5 text-[11px] text-[color:var(--muted)] sm:mb-2">
                  Output is locked to the format you pick.
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {ASPECTS.map((a) => {
                    const on = aspect === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={creating}
                        onClick={() => setAspect(a.id)}
                        className="rounded-lg border px-1.5 py-2 text-center transition sm:rounded-xl sm:px-3 sm:py-3"
                        style={{
                          borderColor: on
                            ? "rgba(232,165,75,0.55)"
                            : "var(--line)",
                          background: on
                            ? "rgba(232,165,75,0.12)"
                            : "transparent",
                        }}
                      >
                        <span
                          className="block text-xs font-bold sm:text-sm"
                          style={{ color: on ? "var(--accent)" : "var(--fg)" }}
                        >
                          {a.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] text-[color:var(--muted)] sm:text-[11px]">
                          {t(a.hintKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] sm:mb-2">
                  {t("length")}
                </p>
                <p className="mb-1.5 text-[11px] text-[color:var(--muted)] sm:mb-2">
                  Clip is cut to this duration — not longer.
                </p>
                <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                  {DURATIONS.map((d) => {
                    const on = duration === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={creating}
                        onClick={() => setDuration(d.id)}
                        className="rounded-full border px-1.5 py-1.5 text-xs font-semibold transition sm:min-w-[4.5rem] sm:px-4 sm:py-2 sm:text-sm"
                        style={{
                          borderColor: on
                            ? "rgba(232,165,75,0.55)"
                            : "var(--line)",
                          background: on
                            ? "rgba(232,165,75,0.14)"
                            : "transparent",
                          color: on ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <Toggle
                  on={useVoice}
                  disabled={creating}
                  label={t("voice")}
                  onChange={setUseVoice}
                />
                <Toggle
                  on={addMusic}
                  disabled={creating}
                  label={t("music")}
                  onChange={setAddMusic}
                />
                <Toggle
                  on={addSubtitles}
                  disabled={creating}
                  label={t("subtitles")}
                  onChange={setAddSubtitles}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  {t("styleMontage")}
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
                  {(
                    [
                      {
                        key: "style",
                        label: t("style"),
                        open: styleOpen,
                        set: setStyleOpen,
                        value: videoStyle
                          ? MONTAGE_STYLE_OPTIONS.find((s) => s.value === videoStyle)
                              ?.label || t("style")
                          : ts("auto"),
                      },
                      {
                        key: "look",
                        label: t("look"),
                        open: lookOpen,
                        set: setLookOpen,
                        value: ts("packs"),
                      },
                      {
                        key: "grade",
                        label: t("grade"),
                        open: gradeOpen,
                        set: setGradeOpen,
                        value: visualEffect
                          ? EFFECTS.find((e) => e.id === visualEffect)?.label ||
                            visualEffect
                          : ts("auto"),
                      },
                      {
                        key: "transition",
                        label: t("transition"),
                        open: transitionOpen,
                        set: setTransitionOpen,
                        value: preferredTransition
                          ? TRANSITIONS.find((tr) => tr.id === preferredTransition)
                              ?.label || preferredTransition
                          : ts("auto"),
                      },
                      {
                        key: "pace",
                        label: t("pace"),
                        open: paceOpen,
                        set: setPaceOpen,
                        value: viralityMode
                          ? ts("viral")
                          : montagePace
                            ? MONTAGE_PACE_PRESETS.find((p) => p.value === montagePace)
                                ?.label || montagePace
                            : ts("auto"),
                      },
                      {
                        key: "motion",
                        label: t("motion"),
                        open: motionOpen,
                        set: setMotionOpen,
                        value: preferredMotion
                          ? MOTIONS.find((m) => m.id === preferredMotion)?.label ||
                            preferredMotion
                          : ts("auto"),
                      },
                      {
                        key: "virality",
                        label: t("virality"),
                        open: viralityOpen,
                        set: setViralityOpen,
                        value: viralityMode ? "On" : "Off",
                      },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      disabled={creating}
                      onClick={() => {
                        const next = !chip.open;
                        setStyleOpen(false);
                        setLookOpen(false);
                        setGradeOpen(false);
                        setTransitionOpen(false);
                        setPaceOpen(false);
                        setMotionOpen(false);
                        setViralityOpen(false);
                        setVoiceOpen(false);
                        setMusicOpen(false);
                        setSubsOpen(false);
                        chip.set(next);
                      }}
                      className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center text-[11px] font-semibold transition sm:px-2 sm:text-xs"
                      style={{
                        borderColor: chip.open
                          ? "rgba(232,165,75,0.55)"
                          : "var(--line)",
                        background: chip.open
                          ? "rgba(232,165,75,0.12)"
                          : "transparent",
                        color: chip.open ? "var(--accent)" : "var(--fg)",
                      }}
                    >
                      <span className="truncate">{chip.label}</span>
                      <span
                        className="max-w-full truncate text-[10px] font-medium"
                        style={{ opacity: 0.75 }}
                      >
                        {chip.value}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        style={{
                          opacity: 0.7,
                          transform: chip.open ? "rotate(180deg)" : undefined,
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  ))}
                </div>

                {styleOpen && (
                  <div className="max-h-[280px] space-y-1.5 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    {MONTAGE_STYLE_OPTIONS.map((s) => {
                      const on = videoStyle === s.value;
                      return (
                        <button
                          key={s.value || "auto"}
                          type="button"
                          disabled={creating}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition sm:text-sm"
                          style={{
                            background: on
                              ? "rgba(232,165,75,0.12)"
                              : "transparent",
                            border: `1px solid ${
                              on ? "rgba(232,165,75,0.45)" : "transparent"
                            }`,
                          }}
                          onClick={() => {
                            setVideoStyle(s.value);
                            const pack = s.value
                              ? VIDEO_STYLE_LOOK[s.value]
                              : null;
                            if (pack) {
                              setVisualEffect(pack.visual_effect);
                              setPreferredTransition(pack.preferred_transition);
                              setMontagePace(pack.montage_pace);
                              setStyleFlashCuts(Boolean(pack.flash_cuts));
                            } else {
                              setVisualEffect("");
                              setPreferredTransition("");
                              setMontagePace("");
                              setStyleFlashCuts(false);
                            }
                          }}
                        >
                          <span>{s.value === "" ? ts("auto") : s.label}</span>
                          {on && (
                            <span className="text-[10px] text-[color:var(--accent)]">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {lookOpen && (
                  <div className="max-h-[280px] space-y-1.5 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    {LOOK_PACKS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={creating}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition"
                        style={{ border: "1px solid var(--line)" }}
                        onClick={() => {
                          setVisualEffect(p.effect);
                          setPreferredTransition(p.transition);
                          setPreferredMotion(
                            p.motion === "none" ? "" : p.motion,
                          );
                          if (
                            p.id === "viral" ||
                            p.id === "boom" ||
                            p.id === "hype" ||
                            p.id === "techno"
                          ) {
                            setMontagePace("viral");
                            setStyleFlashCuts(true);
                          } else if (p.id === "cinema" || p.id === "luxury") {
                            setMontagePace("cinematic");
                            setStyleFlashCuts(false);
                          } else {
                            setMontagePace("medium");
                            setStyleFlashCuts(false);
                          }
                        }}
                      >
                        <span className="text-xs font-semibold sm:text-sm">
                          {p.label}
                        </span>
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {p.effect} · {p.transition} · {p.motion}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {gradeOpen && (
                  <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                      style={{
                        background: !visualEffect
                          ? "rgba(232,165,75,0.12)"
                          : "transparent",
                      }}
                      onClick={() => setVisualEffect("")}
                    >
                      {ts("auto")}
                    </button>
                    {EFFECTS.filter((e) => e.id !== "none").map((e) => {
                      const on = visualEffect === e.id;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          disabled={creating}
                          className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                          style={{
                            background: on
                              ? "rgba(232,165,75,0.12)"
                              : "transparent",
                          }}
                          onClick={() => setVisualEffect(e.id)}
                        >
                          {e.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {transitionOpen && (
                  <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                      style={{
                        background: !preferredTransition
                          ? "rgba(232,165,75,0.12)"
                          : "transparent",
                      }}
                      onClick={() => setPreferredTransition("")}
                    >
                      {ts("auto")}
                    </button>
                    {TRANSITIONS.map((tr) => {
                      const on = preferredTransition === tr.id;
                      return (
                        <button
                          key={tr.id}
                          type="button"
                          disabled={creating}
                          className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                          style={{
                            background: on
                              ? "rgba(232,165,75,0.12)"
                              : "transparent",
                          }}
                          onClick={() => setPreferredTransition(tr.id)}
                        >
                          {tr.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {paceOpen && (
                  <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    <button
                      type="button"
                      disabled={creating || viralityMode}
                      className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                      style={{
                        background:
                          !montagePace && !viralityMode
                            ? "rgba(232,165,75,0.12)"
                            : "transparent",
                      }}
                      onClick={() => setMontagePace("")}
                    >
                      {ts("auto")}
                    </button>
                    {MONTAGE_PACE_PRESETS.map((p) => {
                      const on =
                        (viralityMode ? "viral" : montagePace) === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          disabled={creating || viralityMode}
                          className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                          style={{
                            background: on
                              ? "rgba(232,165,75,0.12)"
                              : "transparent",
                          }}
                          onClick={() => setMontagePace(p.value)}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {motionOpen && (
                  <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-xl border border-[color:var(--line)] p-2">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                      style={{
                        background: !preferredMotion
                          ? "rgba(232,165,75,0.12)"
                          : "transparent",
                      }}
                      onClick={() => setPreferredMotion("")}
                    >
                      {ts("auto")}
                    </button>
                    {MOTIONS.filter((m) => m.id !== "none").map((m) => {
                      const on = preferredMotion === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={creating}
                          className="flex w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold sm:text-sm"
                          style={{
                            background: on
                              ? "rgba(232,165,75,0.12)"
                              : "transparent",
                          }}
                          onClick={() => setPreferredMotion(m.id)}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {viralityOpen && (
                  <div
                    className="rounded-xl border px-3 py-3 sm:px-4"
                    style={{
                      borderColor: viralityMode
                        ? "rgba(232,165,75,0.55)"
                        : "var(--line)",
                      background: viralityMode
                        ? "rgba(232,165,75,0.1)"
                        : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{t("viralityMode")}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--muted)]">
                          Opt-in boom-boom edit: hook in the first second, ~1s
                          punch cuts, flash transitions. Off by default — you
                          must enable it.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={viralityMode}
                        disabled={creating}
                        onClick={() => {
                          const next = !viralityMode;
                          setViralityMode(next);
                          if (next) {
                            setMontagePace("viral");
                            if (!visualEffect) setVisualEffect("punch_pop");
                            if (!preferredTransition)
                              setPreferredTransition("zoomin");
                            if (!preferredMotion)
                              setPreferredMotion("slam_zoom");
                          }
                        }}
                        className="relative h-7 w-12 shrink-0 rounded-full transition"
                        style={{
                          background: viralityMode
                            ? "rgba(232,165,75,0.85)"
                            : "rgba(255,255,255,0.12)",
                        }}
                      >
                        <span
                          className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                          style={{
                            left: viralityMode ? "1.4rem" : "0.2rem",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile: Voice / Music / Subtitles picker chips in one row;
                  open list renders below so chip size never changes */}
              {(useVoice || addMusic || addSubtitles) && (
                <div className="space-y-2 sm:hidden">
                  <div className="flex gap-1.5">
                    {useVoice && (
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => {
                          const next = !voiceOpen;
                          setVoiceOpen(next);
                          if (next) {
                            setMusicOpen(false);
                            setSubsOpen(false);
                            setStyleOpen(false);
                            setLookOpen(false);
                            setGradeOpen(false);
                            setTransitionOpen(false);
                            setPaceOpen(false);
                            setMotionOpen(false);
                            setViralityOpen(false);
                          }
                        }}
                        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center text-[11px] font-semibold transition"
                        style={{
                          borderColor: voiceOpen
                            ? "rgba(232,165,75,0.55)"
                            : "var(--line)",
                          background: voiceOpen
                            ? "rgba(232,165,75,0.12)"
                            : "transparent",
                          color: voiceOpen ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        <span>{t("voice")}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          style={{
                            opacity: 0.7,
                            transform: voiceOpen ? "rotate(180deg)" : undefined,
                            transition: "transform 0.15s ease",
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                    {addMusic && (
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => {
                          const next = !musicOpen;
                          setMusicOpen(next);
                          if (next) {
                            setVoiceOpen(false);
                            setSubsOpen(false);
                            setStyleOpen(false);
                            setLookOpen(false);
                            setGradeOpen(false);
                            setTransitionOpen(false);
                            setPaceOpen(false);
                            setMotionOpen(false);
                            setViralityOpen(false);
                          }
                        }}
                        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center text-[11px] font-semibold transition"
                        style={{
                          borderColor: musicOpen
                            ? "rgba(232,165,75,0.55)"
                            : "var(--line)",
                          background: musicOpen
                            ? "rgba(232,165,75,0.12)"
                            : "transparent",
                          color: musicOpen ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        <span>{t("music")}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          style={{
                            opacity: 0.7,
                            transform: musicOpen ? "rotate(180deg)" : undefined,
                            transition: "transform 0.15s ease",
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                    {addSubtitles && (
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => {
                          const next = !subsOpen;
                          setSubsOpen(next);
                          if (next) {
                            setVoiceOpen(false);
                            setMusicOpen(false);
                            setStyleOpen(false);
                            setLookOpen(false);
                            setGradeOpen(false);
                            setTransitionOpen(false);
                            setPaceOpen(false);
                            setMotionOpen(false);
                            setViralityOpen(false);
                          }
                        }}
                        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center text-[11px] font-semibold transition"
                        style={{
                          borderColor: subsOpen
                            ? "rgba(232,165,75,0.55)"
                            : "var(--line)",
                          background: subsOpen
                            ? "rgba(232,165,75,0.12)"
                            : "transparent",
                          color: subsOpen ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        <span>{t("subtitles")}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          style={{
                            opacity: 0.7,
                            transform: subsOpen ? "rotate(180deg)" : undefined,
                            transition: "transform 0.15s ease",
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {useVoice && voiceOpen && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)] p-2">
                      <VoicePicker
                        value={voiceId}
                        onChange={setVoiceId}
                        hideSearch
                        allowAuto
                      />
                    </div>
                  )}

                  {addMusic && musicOpen && (
                    <div className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-[color:var(--line)] p-2">
                      {musicLoading ? (
                        <p className="text-xs text-[color:var(--muted)]">
                          {t("loadingTracks")}
                        </p>
                      ) : musicTracks.length === 0 ? (
                        <p className="text-xs text-[color:var(--muted)]">
                          {t("noTracksYet")}
                        </p>
                      ) : (
                        <div className="max-h-[280px] space-y-1.5 overflow-y-auto overflow-x-hidden">
                          <button
                            type="button"
                            disabled={creating}
                            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition"
                            style={{
                              background: !musicTrackId
                                ? "rgba(232,165,75,0.12)"
                                : "transparent",
                              border: `1px solid ${
                                !musicTrackId
                                  ? "rgba(232,165,75,0.45)"
                                  : "transparent"
                              }`,
                            }}
                            onClick={() => setMusicTrackId("")}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs">
                              ✦
                            </span>
                            <span className="min-w-0 flex-1 overflow-hidden">
                              <span className="block truncate text-sm font-medium">
                                {ts("auto")}
                              </span>
                              <span className="block truncate text-[11px] text-[color:var(--muted)]">
                                {t("aiPicksTrack")}
                              </span>
                            </span>
                            {!musicTrackId && (
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                                ✓
                              </span>
                            )}
                          </button>
                          {musicTracks.map((track) => {
                            const on = musicTrackId === track.id;
                            const playing = musicPlayingId === track.id;
                            return (
                              <div
                                key={track.id}
                                className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5"
                                style={{
                                  background: on
                                    ? "rgba(232,165,75,0.12)"
                                    : "transparent",
                                  border: `1px solid ${
                                    on
                                      ? "rgba(232,165,75,0.45)"
                                      : "transparent"
                                  }`,
                                }}
                              >
                                <button
                                  type="button"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                  style={{
                                    background: playing
                                      ? "rgba(232,165,75,0.9)"
                                      : "rgba(255,255,255,0.08)",
                                    color: playing ? "#111" : "var(--fg)",
                                  }}
                                  disabled={!track.previewUrl || creating}
                                  aria-label={playing ? ts("stop") : ts("play")}
                                  onClick={() => toggleMusicPreview(track)}
                                >
                                  {playing ? "■" : "▶"}
                                </button>
                                <button
                                  type="button"
                                  disabled={creating}
                                  className="min-w-0 flex-1 overflow-hidden text-left"
                                  onClick={() => setMusicTrackId(track.id)}
                                >
                                  <span className="block truncate text-sm font-medium">
                                    {track.name}
                                  </span>
                                  <span className="block truncate text-[11px] text-[color:var(--muted)]">
                                    {track.artist}
                                  </span>
                                </button>
                                {on && (
                                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {addSubtitles && subsOpen && (
                    <div className="rounded-xl border border-[color:var(--line)] p-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {SUBTITLE_STYLES.map((s) => (
                          <SubtitleStyleCard
                            key={s.id}
                            style={s}
                            active={subtitleStyle === s.id}
                            disabled={creating}
                            onSelect={() => setSubtitleStyle(s.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop: stacked accordions (unchanged behavior) */}
              <div className="hidden space-y-4 sm:block">
                {useVoice && (
                  <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)]">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      onClick={() => setVoiceOpen((v) => !v)}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          {t("voice")}
                        </span>
                        <span className="block truncate text-sm">
                          {voiceId ? ts("customVoice") : ts("autoAiPicks")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-[color:var(--muted)]">
                        {voiceOpen ? ts("hide") : ts("show")}
                      </span>
                    </button>
                    {voiceOpen && (
                      <div className="min-w-0 overflow-hidden border-t border-[color:var(--line)] p-3">
                        <VoicePicker
                          value={voiceId}
                          onChange={setVoiceId}
                          hideSearch
                          allowAuto
                        />
                      </div>
                    )}
                  </div>
                )}

                {addMusic && (
                  <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)]">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      onClick={() => setMusicOpen((v) => !v)}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          {t("music")}
                        </span>
                        <span className="block truncate text-sm">
                          {musicTrackId
                            ? musicTracks.find((tr) => tr.id === musicTrackId)
                                ?.name || ts("selectedTrack")
                            : ts("auto")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-[color:var(--muted)]">
                        {musicOpen ? ts("hide") : ts("show")}
                      </span>
                    </button>
                    {musicOpen && (
                      <div className="min-w-0 space-y-2 overflow-hidden border-t border-[color:var(--line)] p-3">
                        {musicLoading ? (
                          <p className="text-xs text-[color:var(--muted)]">
                            {t("loadingTracks")}
                          </p>
                        ) : musicTracks.length === 0 ? (
                          <p className="text-xs text-[color:var(--muted)]">
                            {t("noTracksYet")}
                          </p>
                        ) : (
                          <div className="max-h-[280px] space-y-1.5 overflow-y-auto overflow-x-hidden">
                            <button
                              type="button"
                              disabled={creating}
                              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition"
                              style={{
                                background: !musicTrackId
                                  ? "rgba(232,165,75,0.12)"
                                  : "transparent",
                                border: `1px solid ${
                                  !musicTrackId
                                    ? "rgba(232,165,75,0.45)"
                                    : "transparent"
                                }`,
                              }}
                              onClick={() => setMusicTrackId("")}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs">
                                ✦
                              </span>
                              <span className="min-w-0 flex-1 overflow-hidden">
                                <span className="block truncate text-sm font-medium">
                                  {ts("auto")}
                                </span>
                                <span className="block truncate text-[11px] text-[color:var(--muted)]">
                                  {t("aiPicksTrack")}
                                </span>
                              </span>
                              {!musicTrackId && (
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                                  ✓
                                </span>
                              )}
                            </button>
                            {musicTracks.map((track) => {
                              const on = musicTrackId === track.id;
                              const playing = musicPlayingId === track.id;
                              return (
                                <div
                                  key={track.id}
                                  className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5"
                                  style={{
                                    background: on
                                      ? "rgba(232,165,75,0.12)"
                                      : "transparent",
                                    border: `1px solid ${
                                      on
                                        ? "rgba(232,165,75,0.45)"
                                        : "transparent"
                                    }`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                    style={{
                                      background: playing
                                        ? "rgba(232,165,75,0.9)"
                                        : "rgba(255,255,255,0.08)",
                                      color: playing ? "#111" : "var(--fg)",
                                    }}
                                    disabled={!track.previewUrl || creating}
                                    aria-label={playing ? ts("stop") : ts("play")}
                                    onClick={() => toggleMusicPreview(track)}
                                  >
                                    {playing ? "■" : "▶"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={creating}
                                    className="min-w-0 flex-1 overflow-hidden text-left"
                                    onClick={() => setMusicTrackId(track.id)}
                                  >
                                    <span className="block truncate text-sm font-medium">
                                      {track.name}
                                    </span>
                                    <span className="block truncate text-[11px] text-[color:var(--muted)]">
                                      {track.artist}
                                    </span>
                                  </button>
                                  {on && (
                                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {addSubtitles && (
                  <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)]">
                    <button
                      type="button"
                      disabled={creating}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      onClick={() => setSubsOpen((v) => !v)}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          {t("subtitles")}
                        </span>
                        <span className="block truncate text-sm">
                          {SUBTITLE_STYLES.find((s) => s.id === subtitleStyle)
                            ?.label || ts("classic")}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-[color:var(--muted)]">
                        {subsOpen ? ts("hide") : ts("show")}
                      </span>
                    </button>
                    {subsOpen && (
                      <div className="border-t border-[color:var(--line)] p-3">
                        <div className="grid grid-cols-4 gap-2">
                          {SUBTITLE_STYLES.map((s) => (
                            <SubtitleStyleCard
                              key={s.id}
                              style={s}
                              active={subtitleStyle === s.id}
                              disabled={creating}
                              onSelect={() => setSubtitleStyle(s.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  Instructions{" "}
                  <span className="font-normal normal-case tracking-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  className="field min-h-[88px] w-full resize-y text-sm"
                  placeholder={t("tipPlaceholder")}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={creating}
                  maxLength={800}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={creating || sources.length === 0}
                onClick={() => void startClip()}
              >
                {creating ? ts("uploading") : t("createClip")}
              </button>
            </div>

            {/* Videos — above settings on mobile */}
            <div className="order-1 flex flex-col overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:order-2 lg:sticky lg:top-4 lg:max-h-[min(720px,calc(100vh-7rem))]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--line)] px-4 py-3">
                <p className="text-sm font-semibold">{t("videos")}</p>
                {sources.length > 0 && sources.length < MAX_SOURCES && (
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => fileRef.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-light transition"
                    style={{
                      borderColor: "var(--line)",
                      color: "var(--accent)",
                    }}
                    aria-label={t("addVideo")}
                  >
                    +
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {sources.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center sm:min-h-[280px]">
                    <button
                      type="button"
                      disabled={creating}
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition hover:border-[color:rgba(232,165,75,0.45)] sm:py-16"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <span
                        className="text-2xl text-[color:var(--accent)]"
                        aria-hidden
                      >
                        +
                      </span>
                      <span className="text-sm font-semibold">
                        {t("addVideo")}
                      </span>
                      <span className="text-xs text-[color:var(--muted)]">
                        MP4 / MOV / WebM · max {MAX_MB} MB
                      </span>
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {sources.map((s, idx) => {
                      const watchUrl =
                        s.kind === "device"
                          ? s.previewUrl
                          : s.downloadUrl || s.previewUrl;
                      return (
                      <li
                        key={s.id}
                        className="overflow-hidden rounded-xl border border-[color:var(--line)] bg-black/20"
                      >
                        <div
                          className="relative aspect-video cursor-pointer bg-black/40"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (watchUrl) setWatchSource(s);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (watchUrl) setWatchSource(s);
                            }
                          }}
                        >
                          {s.kind === "device" && s.previewUrl ? (
                            <video
                              src={s.previewUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : s.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.previewUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[color:var(--muted)]">
                              Video {idx + 1}
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {s.kind === "device" ? ts("device") : ts("media")}
                          </span>
                          {watchUrl && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100">
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white">
                                ▶
                              </span>
                            </span>
                          )}
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-sm text-white hover:bg-black/80"
                            aria-label={ts("remove")}
                            disabled={creating}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSource(s.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="px-3 py-2">
                          <p className="truncate text-sm font-semibold">
                            {s.title}
                          </p>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === "clips" && (
        <section className="rise-delay space-y-3 sm:space-y-4">
          {jobs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--line)] px-4 py-10 text-center text-sm text-[color:var(--muted)]">
              {t("noClipsYet")}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
              {jobs.map((job) => {
                const ready = job.status === "ready" && job.preview_url;
                const busy = QUEUE_STATUSES.has(job.status);
                const failed = job.status === "failed";
                const pct = jobProgressPercent(job.status);
                const aspect = String(job.metadata?.aspect_ratio || "9:16");
                const previewAspect =
                  aspect === "16:9"
                    ? "aspect-video"
                    : aspect === "1:1"
                      ? "aspect-square"
                      : "aspect-[9/16]";
                return (
                  <li
                    key={job.id}
                    className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:rounded-2xl"
                  >
                    <div className={`relative w-full bg-black/50 ${previewAspect}`}>
                      {ready ? (
                        <video
                          src={`/api/jobs/${job.id}/preview`}
                          controls
                          playsInline
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2.5 text-center sm:gap-2 sm:px-4">
                          <p
                            className="text-[11px] font-semibold sm:text-sm"
                            style={{
                              color: failed
                                ? "var(--danger)"
                                : statusColor(job.status),
                            }}
                          >
                            {clipStatusLabel(job.status)}
                          </p>
                          {busy && (
                            <>
                              <p className="text-lg font-bold tabular-nums text-[color:var(--fg)] sm:text-2xl">
                                {pct}%
                              </p>
                              <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/10 sm:h-1.5 sm:w-2/3">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: "var(--accent)",
                                  }}
                                />
                              </div>
                            </>
                          )}
                          {failed && job.error_message && (
                            <p className="line-clamp-3 text-[10px] text-[color:var(--muted)] sm:text-xs">
                              {job.error_message}
                            </p>
                          )}
                        </div>
                      )}
                      {ready && !editorLocked && (
                        <a
                          href={`/dashboard/editor/${job.id}`}
                          className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80 sm:left-2 sm:top-2 sm:h-8 sm:w-8"
                          aria-label={ts("edit")}
                          title={ts("edit")}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </a>
                      )}
                      <CardMenuSlot>
                        <CardMenu
                          items={[
                            ...(ready
                              ? [
                                  ...(!editorLocked
                                    ? [
                                        {
                                          label: ts("edit"),
                                          href: `/dashboard/editor/${job.id}`,
                                        },
                                      ]
                                    : []),
                                  {
                                    label: tc("download"),
                                    onClick: () =>
                                      void downloadVideo(
                                        job.id,
                                        `${(job.title || "clip").replace(/\s+/g, "_")}.mp4`,
                                      ),
                                  },
                                ]
                              : []),
                            {
                              label: tc("delete"),
                              danger: true,
                              disabled: busyId === job.id,
                              onClick: () => void removeJob(job.id),
                            },
                          ]}
                        />
                      </CardMenuSlot>
                    </div>
                    <div className="min-w-0 space-y-0.5 border-t border-[color:var(--line)] px-2 py-1.5 sm:space-y-1 sm:px-3.5 sm:py-3">
                      <p className="truncate text-xs font-semibold sm:text-sm">
                        {job.title || t("aiClip")}
                      </p>
                      <p className="truncate text-[10px] text-[color:var(--muted)] sm:text-xs">
                        {job.duration_seconds ? `${job.duration_seconds}s` : "—"}
                        {" · "}
                        {aspect}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {watchSource && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={watchSource.title}
          onClick={() => setWatchSource(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[color:var(--line)] bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-semibold">
                {watchSource.title}
              </p>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
                aria-label={tc("close")}
                onClick={() => setWatchSource(null)}
              >
                ×
              </button>
            </div>
            <video
              key={watchSource.id}
              src={
                watchSource.kind === "device"
                  ? watchSource.previewUrl || undefined
                  : watchSource.downloadUrl ||
                    watchSource.previewUrl ||
                    undefined
              }
              className="aspect-video w-full bg-black object-contain"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}
    </div>
  );
}
