"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VideoJob } from "@/lib/types";
import { CardMenu, CardMenuSlot } from "@/components/CardMenu";
import {
  JOB_STATUS_LABEL,
  QUEUE_STATUSES,
  jobProgressPercent,
  statusColor,
} from "@/lib/job-status";
import { useToast } from "@/components/ToastNotice";
import { useFeatureLocked } from "@/lib/product-locks-client";
import { VoicePicker } from "@/components/VoicePicker";
import {
  SubtitleStylePicker,
  type SubtitleStyleId,
} from "@/components/SubtitleStylePicker";
import { SUBTITLE_STYLES } from "@/lib/editor-catalog";
import { isCreativityJob } from "@/lib/creativity-jobs";

const ASPECTS = [
  { id: "9:16", label: "9:16", hintKey: "vertical" as const },
  { id: "16:9", label: "16:9", hintKey: "wide" as const },
  { id: "1:1", label: "1:1", hintKey: "square" as const },
] as const;

const DURATIONS = [
  { id: "auto", label: "Auto" },
  { id: "15", label: "15s" },
  { id: "30", label: "30s" },
  { id: "45", label: "45s" },
  { id: "60", label: "60s" },
  { id: "90", label: "90s" },
  { id: "120", labelKey: "min2" as const },
  { id: "180", labelKey: "min3" as const },
  { id: "300", labelKey: "min5" as const },
] as const;

const POPULAR_PROMPTS = [
  {
    id: "viralShorts",
    icon: "trend" as const,
    labelKey: "popularViralShorts" as const,
    promptKey: "promptViralShorts" as const,
  },
  {
    id: "topFilms",
    icon: "film" as const,
    labelKey: "popularTopFilms" as const,
    promptKey: "promptTopFilms" as const,
  },
  {
    id: "spaceFacts",
    icon: "globe" as const,
    labelKey: "popularSpaceFacts" as const,
    promptKey: "promptSpaceFacts" as const,
  },
  {
    id: "businessIdeas",
    icon: "coin" as const,
    labelKey: "popularBusinessIdeas" as const,
    promptKey: "promptBusinessIdeas" as const,
  },
  {
    id: "motivation",
    icon: "sparkle" as const,
    labelKey: "popularMotivation" as const,
    promptKey: "promptMotivation" as const,
  },
  {
    id: "travel",
    icon: "plane" as const,
    labelKey: "popularTravel" as const,
    promptKey: "promptTravel" as const,
  },
] as const;

const PROMPT_LIMIT = 1000;

type Aspect = (typeof ASPECTS)[number]["id"];
type DurationId = (typeof DURATIONS)[number]["id"];
type StudioSetting = "voice" | "music" | "subtitles";
type StudioIconName =
  | "aspect"
  | "time"
  | "type"
  | "idea"
  | "improve"
  | "resolution"
  | "voice"
  | "music"
  | "subtitles"
  | "trend"
  | "film"
  | "globe"
  | "coin"
  | "sparkle"
  | "plane"
  | "play"
  | "stop"
  | "check"
  | "chevron"
  | "close";

type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
};

function aspectOf(job: VideoJob): string {
  return String(job.metadata?.aspect_ratio || "9:16");
}

function titleOf(job: VideoJob, generatingTitle: string): string {
  if (job.title?.trim()) return job.title.trim();
  return generatingTitle;
}

function durationLabel(job: VideoJob, autoLabel: string): string {
  if (job.metadata?.duration_auto && !job.duration_seconds) return autoLabel;
  if (job.duration_seconds) return `${job.duration_seconds}s`;
  if (job.metadata?.duration_seconds) return `${job.metadata.duration_seconds}s`;
  return autoLabel;
}

function videoTypeLabel(
  job: VideoJob,
  emojiVideo: string,
  aiVideo: string,
): string {
  return String(job.metadata?.video_type || "").toLowerCase() === "emoji"
    ? emojiVideo
    : aiVideo;
}

function PromptChip({
  label,
  value,
  open,
  onOpenChange,
  children,
  menuClassName = "",
}: {
  label: string;
  value: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  menuClassName?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition"
        style={{
          borderColor: open ? "rgba(15,118,110,0.45)" : "var(--line)",
          background: open ? "rgba(15,118,110,0.08)" : "#fff",
          color: open ? "var(--accent)" : "var(--fg)",
        }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
          {label}
        </span>
        <span>{value}</span>
        <span className="text-[10px] text-[color:var(--muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          className={`absolute bottom-[calc(100%+6px)] left-0 z-30 max-h-[min(280px,50vh)] min-w-[148px] overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--line)] bg-white p-1.5 shadow-xl ${menuClassName}`}
          role="listbox"
        >
          {children}
        </div>
      )}
    </div>
  );
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
    window.open(
      `/api/jobs/${jobId}/preview?download=1`,
      "_blank",
      "noopener,noreferrer",
    );
  }
}

function StudioIcon({ name, size = 18 }: { name: StudioIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "aspect":
      return (
        <svg {...common}>
          <rect x="6" y="3.5" width="12" height="17" rx="2.5" />
          <path d="M9.5 18h5" />
        </svg>
      );
    case "time":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "type":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "idea":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M8.2 14.2A6 6 0 1 1 15.8 14c-.9.7-1.2 1.4-1.2 2H9.4c0-.7-.3-1.4-1.2-1.8Z" />
        </svg>
      );
    case "improve":
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3 14.4 9.6 21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
          <path d="M5 4.5 6 7l2.5 1L6 9 5 11.5 4 9 1.5 8 4 7 5 4.5Z" />
        </svg>
      );
    case "resolution":
      return (
        <svg {...common}>
          <rect x="3.8" y="6" width="16.4" height="12" rx="2.2" />
          <path d="M8 10h2.8M8 14h5.5M15.5 10H16" />
        </svg>
      );
    case "voice":
      return (
        <svg {...common}>
          <path d="M12 3.8a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3Z" />
          <path d="M6.5 10.5a5.5 5.5 0 0 0 11 0" />
          <path d="M12 16v4" />
          <path d="M9 20h6" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18.2a2.2 2.2 0 1 1-1.1-1.9V6l9-2v10.2a2.2 2.2 0 1 1-1.1-1.9V7.3L9 8.8v9.4Z" />
        </svg>
      );
    case "subtitles":
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
          <path d="M8 11h3M13 11h3M8 14.5h8" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M4 17 9 11l3.3 3.3L20 6" />
          <path d="M15 6h5v5" />
        </svg>
      );
    case "film":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="M8 5v14M16 5v14M4 9h4M16 9h4M4 15h4M16 15h4" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10M9.5 9.3c.6-.7 1.5-1.1 2.7-1.1 1.6 0 2.6.8 2.6 2 0 1.3-1.1 1.8-2.9 2.2-1.6.4-2.4.8-2.4 2 0 1.1 1 1.9 2.7 1.9 1.1 0 2.1-.3 2.9-1" />
        </svg>
      );
    case "plane":
      return (
        <svg {...common}>
          <path d="M3.8 11.3 20 4l-7.3 16-2.1-6.6-6.8-2.1Z" />
          <path d="m10.6 13.4 4.2-4.2" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common}>
          <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.2 4.2L19 7" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    default:
      return null;
  }
}

function SettingField({
  label,
  value,
  icon,
  active,
  disabled,
  onClick,
  compact,
}: {
  label: string;
  value: string;
  icon: StudioIconName;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border bg-white px-1.5 py-2 text-center transition active:scale-[0.99] disabled:opacity-55"
        style={{
          borderColor: active ? "rgba(15,118,110,0.42)" : "var(--line)",
          boxShadow: active
            ? "0 10px 22px rgba(15,118,110,0.12), inset 0 0 0 1px rgba(15,118,110,0.12)"
            : "0 1px 8px rgba(17,24,39,0.035)",
        }}
        aria-expanded={active}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: active ? "rgba(15,118,110,0.28)" : "var(--line)",
            background: active ? "rgba(15,118,110,0.08)" : "rgba(17,24,39,0.025)",
            color: active ? "var(--accent)" : "var(--muted)",
          }}
        >
          <StudioIcon name={icon} size={16} />
        </span>
        <span className="block w-full truncate text-[10px] font-semibold uppercase leading-tight text-[color:var(--muted)]">
          {label}
        </span>
        <span className="line-clamp-2 w-full text-[11px] font-semibold leading-snug text-[color:var(--fg)]">
          {value}
        </span>
        <span
          className="mt-0.5 flex shrink-0 items-center justify-center text-[color:var(--muted)] transition-transform duration-200"
          style={{ transform: active ? "rotate(180deg)" : undefined }}
          aria-hidden
        >
          <StudioIcon name="chevron" size={12} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[58px] min-w-0 items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-55"
      style={{
        borderColor: active ? "rgba(15,118,110,0.42)" : "var(--line)",
        boxShadow: active
          ? "0 10px 22px rgba(15,118,110,0.12), inset 0 0 0 1px rgba(15,118,110,0.12)"
          : "0 1px 8px rgba(17,24,39,0.035)",
      }}
      aria-expanded={active}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        style={{
          borderColor: active ? "rgba(15,118,110,0.28)" : "var(--line)",
          background: active ? "rgba(15,118,110,0.08)" : "rgba(17,24,39,0.025)",
          color: active ? "var(--accent)" : "var(--muted)",
        }}
      >
        <StudioIcon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold uppercase text-[color:var(--muted)]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-[color:var(--fg)]">
          {value}
        </span>
      </span>
      <span
        className="shrink-0 text-[color:var(--muted)] transition"
        style={{ transform: active ? "rotate(180deg)" : undefined }}
      >
        <StudioIcon name="chevron" size={14} />
      </span>
    </button>
  );
}

function FeatureToggle({
  enabled,
  disabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className="mx-auto flex h-[18px] w-full max-w-[4.75rem] items-center justify-center rounded-full border transition active:scale-[0.98] disabled:opacity-45"
      style={{
        borderColor: enabled ? "rgba(15,118,110,0.5)" : "var(--line)",
        background: enabled ? "rgba(15,118,110,0.14)" : "rgba(17,24,39,0.04)",
        color: enabled ? "var(--accent)" : "var(--muted)",
      }}
    >
      {enabled ? (
        <StudioIcon name="check" size={11} />
      ) : (
        <span className="h-1 w-3 rounded-full bg-[color:var(--line)]" aria-hidden />
      )}
    </button>
  );
}

function MusicPanel({
  tracks,
  loading,
  value,
  playingId,
  disabled,
  onPick,
  onPlay,
  embedded,
}: {
  tracks: MusicTrack[];
  loading: boolean;
  value: string;
  playingId: string | null;
  disabled?: boolean;
  onPick: (value: string) => void;
  onPlay: (track: MusicTrack) => void;
  embedded?: boolean;
}) {
  const t = useTranslations("studio.creativity");
  const tc = useTranslations("studio.common");
  const autoOn = !value;

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "space-y-2"
      }
    >
      <button
        type="button"
        disabled={disabled}
        className="flex w-full shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition disabled:opacity-55"
        style={{
          borderColor: autoOn ? "rgba(15,118,110,0.42)" : "var(--line)",
          background: autoOn ? "rgba(15,118,110,0.08)" : "#fff",
        }}
        onClick={() => onPick("")}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <StudioIcon name="sparkle" size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{t("musicAuto")}</span>
          <span className="block truncate text-[10px] text-[color:var(--muted)]">
            {tc("aiPicks")}
          </span>
        </span>
        {autoOn && <StudioIcon name="check" size={14} />}
      </button>

      {loading ? (
        <p className="shrink-0 rounded-lg border border-[color:var(--line)] bg-white px-2 py-2 text-xs text-[color:var(--muted)]">
          {t("loadingTracks")}
        </p>
      ) : tracks.length === 0 ? (
        <p className="shrink-0 rounded-lg border border-dashed border-[color:var(--line)] bg-white px-2 py-2 text-xs text-[color:var(--muted)]">
          {t("noMusicYet")}
        </p>
      ) : (
        <div
          className={
            embedded
              ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5"
              : "max-h-40 space-y-1 overflow-y-auto pr-0.5"
          }
        >
          {tracks.map((track) => {
            const on = value === track.id;
            const playing = playingId === track.id;
            return (
              <div
                key={track.id}
                className="mb-1 flex min-w-0 items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5"
                style={{
                  borderColor: on ? "rgba(15,118,110,0.42)" : "var(--line)",
                }}
              >
                <button
                  type="button"
                  disabled={disabled || !track.previewUrl}
                  aria-label={playing ? tc("stop") : tc("play")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-45"
                  style={{
                    background: playing ? "var(--accent)" : "rgba(17,24,39,0.05)",
                    color: playing ? "#fff" : "var(--fg)",
                  }}
                  onClick={() => onPlay(track)}
                >
                  <StudioIcon name={playing ? "stop" : "play"} size={15} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onPick(track.id)}
                >
                  <span className="block truncate text-sm font-semibold">
                    {track.name}
                  </span>
                  <span className="block truncate text-[11px] text-[color:var(--muted)]">
                    {track.artist}
                  </span>
                </button>
                {on && <StudioIcon name="check" size={16} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudioSettingsPanel({
  activeSetting,
  disabled,
  useMusic,
  useVoice,
  useSubtitles,
  voiceLabel,
  musicLabel,
  subtitleLabel,
  voiceId,
  musicTracks,
  musicLoading,
  musicTrackId,
  musicPlayingId,
  subtitleStyle,
  onActiveSetting,
  onUseMusic,
  onUseVoice,
  onUseSubtitles,
  onVoice,
  onMusic,
  onSubtitle,
  onMusicPreview,
}: {
  activeSetting: StudioSetting | null;
  disabled?: boolean;
  useMusic: boolean;
  useVoice: boolean;
  useSubtitles: boolean;
  voiceLabel: string;
  musicLabel: string;
  subtitleLabel: string;
  voiceId: string;
  musicTracks: MusicTrack[];
  musicLoading: boolean;
  musicTrackId: string;
  musicPlayingId: string | null;
  subtitleStyle: SubtitleStyleId;
  onActiveSetting: (value: StudioSetting | null) => void;
  onUseMusic: (enabled: boolean) => void;
  onUseVoice: (enabled: boolean) => void;
  onUseSubtitles: (enabled: boolean) => void;
  onVoice: (value: string) => void;
  onMusic: (value: string) => void;
  onSubtitle: (value: SubtitleStyleId) => void;
  onMusicPreview: (track: MusicTrack) => void;
}) {
  const t = useTranslations("studio.creativity");

  const listOpen =
    activeSetting !== null &&
    ((activeSetting === "music" && useMusic) ||
      (activeSetting === "voice" && useVoice) ||
      (activeSetting === "subtitles" && useSubtitles));

  function setFeatureEnabled(kind: StudioSetting, enabled: boolean) {
    if (kind === "music") onUseMusic(enabled);
    if (kind === "voice") onUseVoice(enabled);
    if (kind === "subtitles") onUseSubtitles(enabled);
    if (!enabled && activeSetting === kind) {
      onActiveSetting(null);
    }
  }

  function openSetting(kind: StudioSetting) {
    const enabled =
      kind === "music" ? useMusic : kind === "voice" ? useVoice : useSubtitles;
    if (!enabled || disabled) return;
    onActiveSetting(activeSetting === kind ? null : kind);
  }

  const offLabel = t("featureOff");

  return (
    <aside
      className={`rise-delay flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white p-3 shadow-[0_16px_50px_rgba(17,24,39,0.06)] sm:p-4 ${
        listOpen
          ? "max-lg:h-[min(400px,52vh)] lg:min-h-0 lg:flex-1 lg:self-stretch lg:h-full lg:max-h-full"
          : "h-auto lg:h-auto"
      }`}
    >
      <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <FeatureToggle
            enabled={useMusic}
            disabled={disabled}
            ariaLabel={t("music")}
            onChange={(v) => setFeatureEnabled("music", v)}
          />
          <SettingField
            compact
            label={t("music")}
            value={useMusic ? musicLabel : offLabel}
            icon="music"
            active={useMusic && activeSetting === "music"}
            disabled={disabled || !useMusic}
            onClick={() => openSetting("music")}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <FeatureToggle
            enabled={useVoice}
            disabled={disabled}
            ariaLabel={t("voice")}
            onChange={(v) => setFeatureEnabled("voice", v)}
          />
          <SettingField
            compact
            label={t("voice")}
            value={useVoice ? voiceLabel : offLabel}
            icon="voice"
            active={useVoice && activeSetting === "voice"}
            disabled={disabled || !useVoice}
            onClick={() => openSetting("voice")}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <FeatureToggle
            enabled={useSubtitles}
            disabled={disabled}
            ariaLabel={t("subtitles")}
            onChange={(v) => setFeatureEnabled("subtitles", v)}
          />
          <SettingField
            compact
            label={t("subtitles")}
            value={useSubtitles ? subtitleLabel : offLabel}
            icon="subtitles"
            active={useSubtitles && activeSetting === "subtitles"}
            disabled={disabled || !useSubtitles}
            onClick={() => openSetting("subtitles")}
          />
        </div>
      </div>

      {listOpen ? (
        <div className="mt-2.5 flex min-h-0 flex-1 basis-0 flex-col overflow-hidden lg:min-h-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-2">
            {activeSetting === "voice" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <VoicePicker
                  value={voiceId}
                  onChange={onVoice}
                  hideSearch
                  allowAuto
                  compactList
                  fillHeight
                />
              </div>
            )}
            {activeSetting === "music" && (
              <MusicPanel
                embedded
                tracks={musicTracks}
                loading={musicLoading}
                value={musicTrackId}
                playingId={musicPlayingId}
                disabled={disabled}
                onPick={onMusic}
                onPlay={onMusicPreview}
              />
            )}
            {activeSetting === "subtitles" && (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <SubtitleStylePicker
                  embedded
                  value={subtitleStyle}
                  onChange={onSubtitle}
                  disabled={disabled}
                  defaultOpen
                  className="min-h-0 min-w-0 flex-1 border-0 shadow-none"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function MobileCreateBar({
  creating,
  canCreate,
  onCreate,
  labelStarting,
  labelCreate,
}: {
  creating: boolean;
  canCreate: boolean;
  onCreate: () => void;
  labelStarting: string;
  labelCreate: string;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[68] flex justify-center px-4 pb-1 lg:hidden"
      style={{
        bottom: "calc(5.35rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        type="button"
        className="creativity-create-float creativity-create-pill pointer-events-auto inline-flex shrink-0 items-center justify-center gap-2 disabled:pointer-events-none"
        disabled={creating || !canCreate}
        aria-disabled={creating || !canCreate}
        onClick={onCreate}
      >
        <span>{creating ? labelStarting : labelCreate}</span>
        <StudioIcon name="sparkle" size={16} />
      </button>
    </div>
  );
}

export function CreativityStudioFromUrl({
  initialJobs,
}: {
  initialJobs: VideoJob[];
}) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = rawTab === "library" ? "library" : "create";
  return <CreativityStudio initialJobs={initialJobs} tab={tab} />;
}

export function CreativityStudio({
  initialJobs,
  tab,
}: {
  initialJobs: VideoJob[];
  tab: "create" | "library";
}) {
  const t = useTranslations("studio.creativity");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [jobs, setJobs] = useState(() => initialJobs.filter(isCreativityJob));
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [durationId, setDurationId] = useState<DurationId>("auto");
  const [openChip, setOpenChip] = useState<"format" | "duration" | null>(null);
  const [useMusic, setUseMusic] = useState(true);
  const [useVoice, setUseVoice] = useState(true);
  const [useSubtitles, setUseSubtitles] = useState(true);
  const [voiceId, setVoiceId] = useState("");
  const [musicTrackId, setMusicTrackId] = useState("");
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicPlayingId, setMusicPlayingId] = useState<string | null>(null);
  const [subtitleStyle, setSubtitleStyle] =
    useState<SubtitleStyleId>("classic");
  const [activeSetting, setActiveSetting] = useState<StudioSetting | null>(
    null,
  );
  const [ideaCursor, setIdeaCursor] = useState(0);
  const [improving, setImproving] = useState(false);
  const [creating, setCreating] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const { show: toast, notice } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const editorLocked = useFeatureLocked("video_editor");

  const canCreate = prompt.trim().length >= 8;

  const activeJobs = useMemo(
    () => jobs.filter((j) => QUEUE_STATUSES.has(j.status)),
    [jobs],
  );
  const libraryJobs = useMemo(
    () => jobs.filter((j) => j.status === "ready" || j.status === "failed"),
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

    if (data) {
      setJobs((data as VideoJob[]).filter(isCreativityJob));
    }
  }, []);

  useEffect(() => {
    setJobs(initialJobs.filter(isCreativityJob));
  }, [initialJobs]);

  useEffect(() => {
    if (activeJobs.length === 0) return;
    const t = window.setInterval(() => {
      void refreshJobs();
    }, 2500);
    return () => window.clearInterval(t);
  }, [activeJobs.length, refreshJobs]);

  useEffect(() => {
    if (!useMusic || musicTracks.length > 0 || musicLoading) {
      return;
    }
    let cancelled = false;
    setMusicLoading(true);
    void (async () => {
      const collected: MusicTrack[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 30 && !cancelled) {
        const res = await fetch(
          `/api/media/search?type=music&page=${page}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) break;

        const items = (data.items || []) as Array<{
          id: string;
          title?: string;
          author?: string;
          previewUrl?: string | null;
          downloadUrl?: string | null;
        }>;

        for (const item of items) {
          collected.push({
            id: String(item.id),
            name: item.title || tc("track"),
            artist: item.author || tc("library"),
            previewUrl: item.previewUrl || item.downloadUrl || null,
          });
        }

        hasMore =
          Boolean(data.hasMore) &&
          items.length > 0 &&
          collected.length < Number(data.total || collected.length + 1);
        page += 1;
      }

      if (cancelled) return;

      if (collected.length === 0) {
        const fallback = await fetch("/api/music/group?limit=500", {
          cache: "no-store",
        });
        const data = await fallback.json().catch(() => ({}));
        if (fallback.ok) {
          for (const track of (data.tracks || []) as Array<{
            id: string;
            name?: string;
            artist?: string | null;
            previewUrl?: string | null;
          }>) {
            collected.push({
              id: String(track.id),
              name: track.name || tc("track"),
              artist: track.artist || tc("library"),
              previewUrl: track.previewUrl || null,
            });
          }
        }
      }

      setMusicTracks(collected);
      setMusicLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [useMusic, musicLoading, musicTracks.length, tc]);

  useEffect(() => {
    return () => {
      musicAudioRef.current?.pause();
    };
  }, []);

  const voiceLabel = voiceId ? tc("customVoice") : t("voiceAuto");
  const selectedTrack = musicTracks.find((track) => track.id === musicTrackId);
  const musicLabel = selectedTrack?.name || t("musicAuto");
  const subtitleLabel =
    SUBTITLE_STYLES.find((style) => style.id === subtitleStyle)?.label ||
    tc("classic");

  const durationChipLabel =
    durationId === "auto"
      ? tc("auto")
      : (() => {
          const picked = DURATIONS.find((d) => d.id === durationId);
          if (!picked) return tc("auto");
          if ("labelKey" in picked) return t(picked.labelKey);
          return picked.label;
        })();
  const aspectChipLabel = ASPECTS.find((a) => a.id === aspect)?.label || "9:16";

  function setPromptLimited(next: string) {
    setPrompt(next.slice(0, PROMPT_LIMIT));
  }

  function compactPromptTopic(text: string) {
    const firstSentence = text.replace(/\s+/g, " ").split(/[.!?]\s/)[0] || text;
    return firstSentence
      .replace(/^(создай|create|erstelle|erstell|baue)\s+/i, "")
      .trim()
      .slice(0, 220);
  }

  function fillPopularPrompt(promptKey: (typeof POPULAR_PROMPTS)[number]["promptKey"]) {
    setPromptLimited(t(promptKey));
  }

  function getIdea() {
    const next = POPULAR_PROMPTS[ideaCursor % POPULAR_PROMPTS.length];
    setIdeaCursor((v) => v + 1);
    setPromptLimited(t(next.promptKey));
  }

  async function improvePrompt() {
    if (improving || creating) return;
    const text = prompt.trim();
    const base = text || t("promptMotivation");
    setImproving(true);
    try {
      const res = await fetch("/api/prompts/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: base }),
      });
      const data = await res.json().catch(() => ({}));
      const improved = String(data.prompt || "").trim();
      setPromptLimited(
        res.ok && improved
          ? improved
          : t("improvedPrompt", { prompt: compactPromptTopic(base) }),
      );
    } catch {
      setPromptLimited(t("improvedPrompt", { prompt: compactPromptTopic(base) }));
    } finally {
      setImproving(false);
    }
  }

  function toggleMusicPreview(track: MusicTrack) {
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

  async function createVideo() {
    const text = prompt.trim();
    if (text.length < 8) {
      toast(t("needSentence"), "error");
      return;
    }
    setCreating(true);
    setActiveSetting(null);
    setOpenChip(null);

    const duration_auto = durationId === "auto";

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: text,
        publish: false,
        source: "creativity",
        pipeline: "creativity",
        duration_auto,
        duration_seconds: duration_auto ? null : Number(durationId),
        aspect_ratio: aspect,
        video_type: "standard",
        output_resolution: "1080p",
        use_voice: useVoice,
        voice_id: useVoice ? voiceId || null : null,
        add_music: useMusic,
        music_track_id: useMusic ? musicTrackId || null : null,
        add_subtitles: useSubtitles,
        subtitle_style: useSubtitles ? subtitleStyle : "classic",
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      toast(data.error || t("failedStart"), "error");
      return;
    }
    setPrompt("");
    toast(t("started"), "info");
    await refreshJobs();
  }

  async function removeCreation(jobId: string) {
    if (!confirm(t("removeVideo"))) return;
    setBusyId(jobId);
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast(data.error || tc("failedToDelete"), "error");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    toast(t("videoDeleted"));
  }

  return (
    <div
      className={`relative mx-auto flex w-full max-w-6xl flex-col gap-4 lg:gap-6 ${
        tab === "create"
          ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-12"
          : "pb-12"
      }`}
    >
      {notice}

      {tab === "create" && (
        <section className="space-y-3 lg:space-y-5">
          <header className="rise">
            <h1
              className="font-[family-name:var(--font-syne)] text-[1.45rem] leading-tight sm:text-[1.65rem] lg:text-[2.05rem]"
              style={{ fontWeight: 800 }}
            >
              {t("heroTitle")}
            </h1>
          </header>

          <div className="grid min-h-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-5">
            <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:min-h-0">

            <div className="rise-delay overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white shadow-[0_16px_50px_rgba(17,24,39,0.07)]">
              <div className="relative">
                <textarea
                  className="min-h-[168px] w-full resize-y border-0 bg-transparent px-4 pb-10 pt-4 text-sm leading-relaxed outline-none placeholder:text-[color:var(--muted)] sm:min-h-[214px] lg:min-h-[238px] sm:px-5 sm:pt-4"
                  placeholder={t("placeholder")}
                  value={prompt}
                  onChange={(e) => setPromptLimited(e.target.value)}
                  disabled={creating}
                  maxLength={PROMPT_LIMIT}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void createVideo();
                    }
                  }}
                />
                <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-[color:var(--muted)]">
                  {prompt.length}/{PROMPT_LIMIT}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--line)] px-3 py-2.5 sm:px-4">
                <PromptChip
                  label={t("format")}
                  value={aspectChipLabel}
                  open={openChip === "format"}
                  onOpenChange={(open) => setOpenChip(open ? "format" : null)}
                >
                  {ASPECTS.map((a) => {
                    const on = aspect === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="option"
                        aria-selected={on}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-black/[0.03]"
                        style={{ color: on ? "var(--accent)" : "var(--fg)" }}
                        onClick={() => {
                          setAspect(a.id);
                          setOpenChip(null);
                        }}
                      >
                        <span className="font-semibold">{a.label}</span>
                        <span className="text-[11px] text-[color:var(--muted)]">
                          {t(a.hintKey)}
                        </span>
                      </button>
                    );
                  })}
                </PromptChip>

                <PromptChip
                  label={t("time")}
                  value={durationChipLabel}
                  open={openChip === "duration"}
                  onOpenChange={(open) => setOpenChip(open ? "duration" : null)}
                  menuClassName="!max-h-[min(176px,32vh)] min-w-[120px]"
                >
                  {DURATIONS.map((d) => {
                    const on = durationId === d.id;
                    const label =
                      "labelKey" in d ? t(d.labelKey) : d.label;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="option"
                        aria-selected={on}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-black/[0.03]"
                        style={{ color: on ? "var(--accent)" : "var(--fg)" }}
                        onClick={() => {
                          setDurationId(d.id);
                          setOpenChip(null);
                        }}
                      >
                        <span>{label}</span>
                        {on ? <StudioIcon name="check" size={13} /> : null}
                      </button>
                    );
                  })}
                </PromptChip>

                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={creating}
                    title={t("getIdea")}
                    aria-label={t("getIdea")}
                    onClick={getIdea}
                    className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white p-1.5 text-[color:var(--muted)] transition hover:border-[color:rgba(15,118,110,0.35)] hover:text-[color:var(--accent)] active:scale-[0.97] disabled:opacity-50"
                  >
                    <StudioIcon name="idea" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={creating || improving}
                    title={
                      improving ? t("improvingRequest") : t("improveRequest")
                    }
                    aria-label={
                      improving ? t("improvingRequest") : t("improveRequest")
                    }
                    onClick={() => void improvePrompt()}
                    className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white p-1.5 text-[color:var(--muted)] transition hover:border-[color:rgba(15,118,110,0.35)] hover:text-[color:var(--accent)] active:scale-[0.97] disabled:opacity-50"
                    style={
                      improving
                        ? {
                            borderColor: "rgba(15,118,110,0.4)",
                            color: "var(--accent)",
                          }
                        : undefined
                    }
                  >
                    <StudioIcon name="improve" size={16} />
                  </button>
                </div>
              </div>

              <div className="hidden border-t border-[color:var(--line)] p-3 sm:px-4 sm:py-3.5 lg:block">
                <button
                  type="button"
                  className="btn btn-primary inline-flex min-h-[52px] w-full rounded-xl text-sm"
                  disabled={creating || !canCreate}
                  onClick={() => void createVideo()}
                >
                  <span>{creating ? t("starting") : t("create")}</span>
                  <StudioIcon name="sparkle" size={17} />
                </button>
              </div>
            </div>

            <div className="hidden border-t border-[color:var(--line)] pt-4 lg:block">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--muted)]">
                <span className="text-[color:var(--accent-warm)]">
                  <StudioIcon name="sparkle" size={16} />
                </span>
                {t("popularPrompts")}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {POPULAR_PROMPTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={creating}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-[color:var(--line)] bg-white px-3 text-left text-sm font-semibold shadow-[0_2px_12px_rgba(17,24,39,0.04)] transition hover:border-[color:rgba(15,118,110,0.32)] hover:text-[color:var(--accent)] active:scale-[0.99]"
                    onClick={() => fillPopularPrompt(item.promptKey)}
                  >
                    <span className="text-[color:var(--accent)]">
                      <StudioIcon name={item.icon} size={17} />
                    </span>
                    <span className="min-w-0 truncate">{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            </div>

            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-h-0 lg:self-stretch">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
            <StudioSettingsPanel
              activeSetting={activeSetting}
              disabled={creating}
              useMusic={useMusic}
              useVoice={useVoice}
              useSubtitles={useSubtitles}
              voiceLabel={voiceLabel}
              musicLabel={musicLabel}
              subtitleLabel={subtitleLabel}
              voiceId={voiceId}
              musicTracks={musicTracks}
              musicLoading={musicLoading}
              musicTrackId={musicTrackId}
              musicPlayingId={musicPlayingId}
              subtitleStyle={subtitleStyle}
              onActiveSetting={setActiveSetting}
              onUseMusic={setUseMusic}
              onUseVoice={setUseVoice}
              onUseSubtitles={setUseSubtitles}
              onVoice={setVoiceId}
              onMusic={setMusicTrackId}
              onSubtitle={setSubtitleStyle}
              onMusicPreview={toggleMusicPreview}
            />
            </div>
            </div>
          </div>

          <MobileCreateBar
            creating={creating}
            canCreate={canCreate}
            onCreate={() => void createVideo()}
            labelCreate={t("create")}
            labelStarting={t("starting")}
          />
        </section>
      )}

      {tab === "library" && (
        <section className="rise-delay space-y-4">
          {libraryJobs.length === 0 && activeJobs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--line)] p-10 text-center text-sm text-[color:var(--muted)]">
              {t("noVideosYet")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[...activeJobs, ...libraryJobs].map((job) => {
                const failed = job.status === "failed";
                const busy = QUEUE_STATUSES.has(job.status);
                const canWatch =
                  Boolean(job.preview_url) ||
                  Boolean(job.storage_path) ||
                  job.status === "ready";
                const mediaSrc = `/api/jobs/${job.id}/preview`;
                const pct = jobProgressPercent(job.status);
                return (
                  <article
                    key={job.id}
                    className="group relative overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]"
                  >
                    <div className="relative aspect-[4/5] bg-black/50">
                      {canWatch && !failed && !busy ? (
                        <video
                          key={job.id}
                          src={mediaSrc}
                          poster={job.thumbnail_url || undefined}
                          className="h-full w-full bg-black object-contain"
                          controls
                          playsInline
                          preload="metadata"
                          controlsList="nodownload"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: failed
                                ? "var(--danger)"
                                : statusColor(job.status),
                            }}
                          >
                            {failed
                              ? "Failed"
                              : JOB_STATUS_LABEL[job.status] || job.status}
                          </p>
                          {busy && (
                            <>
                              <p className="text-2xl font-bold tabular-nums">
                                {pct}%
                              </p>
                              <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-white/10">
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
                            <p className="line-clamp-3 text-xs text-[color:var(--muted)]">
                              {job.error_message}
                            </p>
                          )}
                        </div>
                      )}

                      {canWatch && !failed && !busy && !editorLocked && (
                        <Link
                          href={`/dashboard/editor/${job.id}`}
                          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                          aria-label={tc("edit")}
                          title={tc("edit")}
                        >
                          <svg
                            width="14"
                            height="14"
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
                        </Link>
                      )}

                      <CardMenuSlot>
                        <CardMenu
                          items={[
                            ...(canWatch && !failed && !busy
                              ? [
                                  ...(!editorLocked
                                    ? [
                                        {
                                          label: tc("edit"),
                                          onClick: () =>
                                            router.push(
                                              `/dashboard/editor/${job.id}`,
                                            ),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: tCommon("download"),
                                    onClick: () =>
                                      void downloadVideo(
                                        job.id,
                                        `${(job.title || "orzuai")
                                          .replace(/[^\w-]+/g, "_")
                                          .slice(0, 40)}.mp4`,
                                      ),
                                  },
                                  {
                                    label: tc("open"),
                                    onClick: () => {
                                      window.open(
                                        `/api/jobs/${job.id}/preview`,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                    },
                                  },
                                ]
                              : []),
                            {
                              label:
                                busyId === job.id
                                  ? "Deleting..."
                                  : tCommon("delete"),
                              danger: true,
                              disabled: busyId === job.id || busy,
                              onClick: () => void removeCreation(job.id),
                            },
                          ]}
                        />
                      </CardMenuSlot>
                    </div>

                    <div className="space-y-1 border-t border-[color:var(--line)] p-3">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">
                        {titleOf(job, t("generatingTitle"))}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[color:var(--muted)]">
                        <span>{aspectOf(job)}</span>
                        <span>·</span>
                        <span>{durationLabel(job, tc("auto"))}</span>
                        <span>·</span>
                        <span>
                          {videoTypeLabel(job, t("emojiVideo"), t("aiVideo"))}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
