"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { VideoJob } from "@/lib/types";
import { BrandMark } from "@/components/BrandLogo";
import { useToast } from "@/components/ToastNotice";
import {
  useCurrentFrameCapture,
  useVideoFrameThumbs,
} from "@/hooks/useVideoFrameThumbs";
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
import { captionPreviewStyle } from "@/lib/subtitle-caption-style";
import { VIDEO_FRAMES, frameToCss, isVideoFrameId } from "@/lib/video-frames";

type ToolId =
  | "visuals"
  | "audio"
  | "voice"
  | "layouts"
  | "text"
  | "elements"
  | "style"
  | "subtitles"
  | "frames";

type MusicTrack = {
  id: string;
  title: string;
  author: string;
  previewUrl: string | null;
  durationSec?: number | null;
  mood?: string | null;
  genreName?: string | null;
};

type VisualFilter = "all" | "video" | "photo";

type VoiceItem = {
  id: string;
  name: string;
  category: string | null;
  labels: string | null;
  gender: string | null;
  accent: string | null;
  age: string | null;
  preview_url: string | null;
  source?: "account" | "shared";
};

type GenderFilter = "all" | "male" | "female" | "neutral";

type StyleCategory =
  | "looks"
  | "effects"
  | "motion"
  | "transitions"
  | "fades"
  | "color";

type VisualAsset = {
  id: string;
  key: string;
  kind: "video" | "photo";
  provider: string;
  title: string;
  author?: string | null;
  thumb: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
};

type SourceClip = {
  id: string;
  originalIndex?: number;
  provider?: string;
  kind?: string;
  thumb?: string | null;
  label?: string;
  query?: string;
  color?: string;
  duration_seconds?: number | null;
};

type TimelineScene = {
  id: string;
  label: string;
  thumb?: string | null;
  duration: number;
  originalIndex?: number;
  selectedMedia?: VisualAsset;
  source?: SourceClip;
  generated?: boolean;
};

type SelectedElement = {
  kind: "emoji" | "icon";
  label: string;
  symbol: string;
  assetUrl?: string | null;
  sourceId?: string | null;
  provider?: string | null;
};

const ACCENT = "#8a00d4";
const SURFACE = "#ffffff";
const LINE = "rgba(17,24,39,0.10)";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "visuals", label: "Library" },
  { id: "audio", label: "Audio" },
  { id: "voice", label: "Voice" },
  { id: "layouts", label: "Layouts" },
  { id: "text", label: "Text" },
  { id: "elements", label: "Elements" },
  { id: "style", label: "Filter" },
  { id: "subtitles", label: "Subtitles" },
  { id: "frames", label: "Frames" },
];

const ELEMENT_EMOJIS: SelectedElement[] = [
  { kind: "emoji", label: "Fire", symbol: "🔥" },
  { kind: "emoji", label: "Spark", symbol: "✨" },
  { kind: "emoji", label: "Rocket", symbol: "🚀" },
  { kind: "emoji", label: "Idea", symbol: "💡" },
  { kind: "emoji", label: "Check", symbol: "✅" },
  { kind: "emoji", label: "Star", symbol: "⭐" },
  { kind: "emoji", label: "Money", symbol: "💰" },
  { kind: "emoji", label: "Warning", symbol: "⚠️" },
  { kind: "emoji", label: "Target", symbol: "🎯" },
  { kind: "emoji", label: "Heart", symbol: "❤️" },
  { kind: "emoji", label: "Chart", symbol: "📈" },
  { kind: "emoji", label: "Book", symbol: "📘" },
];

const ELEMENT_ICONS: SelectedElement[] = [
  { kind: "icon", label: "Arrow", symbol: "->" },
  { kind: "icon", label: "Quote", symbol: "''" },
  { kind: "icon", label: "Plus", symbol: "+" },
  { kind: "icon", label: "Bolt", symbol: "!" },
  { kind: "icon", label: "Circle", symbol: "o" },
  { kind: "icon", label: "Frame", symbol: "[]" },
  { kind: "icon", label: "Wave", symbol: "~" },
  { kind: "icon", label: "Hash", symbol: "#" },
  { kind: "icon", label: "Play", symbol: ">" },
  { kind: "icon", label: "Step", symbol: "1" },
  { kind: "icon", label: "Corner", symbol: "L" },
  { kind: "icon", label: "Focus", symbol: "+" },
];

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function formatSeconds(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0.0s";
  return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
}

function smartSearchQuery(value: string, fallback: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.join(" ") || fallback;
}

function visualOrientation(aspect: string) {
  if (aspect === "16:9") return "landscape";
  if (aspect === "1:1") return "square";
  return "portrait";
}

function visualAssetKey(item: VisualAsset) {
  return item.key || `${item.provider}:${item.kind}:${item.id}`;
}

function mergeVisualAssets(...groups: VisualAsset[][]) {
  const seen = new Set<string>();
  const out: VisualAsset[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = visualAssetKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function elementKey(item: SelectedElement) {
  return `${item.kind}:${item.sourceId || item.label}:${item.assetUrl || item.symbol}`;
}

function mergeElements(prev: SelectedElement[], next: SelectedElement[]) {
  const seen = new Set(prev.map(elementKey));
  const out = [...prev];
  for (const item of next) {
    const key = elementKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function hueFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

function previewGradient(id: string, muted = false) {
  const hue = hueFromId(id);
  const sat = muted ? 42 : 70;
  const light = muted ? 34 : 48;
  return [
    `linear-gradient(135deg, hsl(${hue} ${sat}% ${Math.max(14, light - 22)}%), hsl(${(hue + 42) % 360} ${sat}% ${light}%) 48%, hsl(${(hue + 96) % 360} ${Math.min(88, sat + 8)}% ${Math.min(72, light + 18)}%))`,
    `radial-gradient(circle at 18% 18%, rgba(255,255,255,0.32), transparent 30%)`,
  ].join(", ");
}

function effectPreviewStyle(
  item: (typeof EFFECTS)[number],
): CSSProperties {
  return {
    background: previewGradient(item.id, item.css.includes("grayscale")),
    filter: item.css && item.css !== "none" ? item.css : undefined,
  };
}

function lookPackPreviewStyle(
  pack: (typeof LOOK_PACKS)[number],
): CSSProperties {
  const effectCss = EFFECTS.find((item) => item.id === pack.effect)?.css || "";
  return {
    background: previewGradient(pack.id),
    filter: effectCss || undefined,
  };
}

function cleanSceneLabel(
  label: string | null | undefined,
  fallback: string,
  index: number,
) {
  const value = String(label || "").trim();
  if (!value || /^clip\s*\d+$/i.test(value) || /^scene\s*\d+$/i.test(value)) {
    return `${fallback} ${index + 1}`.trim();
  }
  return value;
}

function mergeVoices(prev: VoiceItem[], next: VoiceItem[]) {
  const seen = new Set(prev.map((item) => item.id));
  const out = [...prev];
  for (const item of next) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function voiceMeta(voice: VoiceItem) {
  return (
    [voice.gender, voice.accent, voice.age, voice.category]
      .filter(Boolean)
      .join(" - ") ||
    voice.labels ||
    voice.source ||
    "ElevenLabs"
  );
}

function preloadVisualAsset(asset: VisualAsset) {
  const src = asset.previewUrl || asset.thumb || asset.downloadUrl;
  if (!src) return Promise.resolve();
  if (asset.kind === "video") {
    return new Promise<void>((resolve) => {
      const video = document.createElement("video");
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeAttribute("src");
        video.load();
        resolve();
      };
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = finish;
      video.onerror = finish;
      video.src = src;
      window.setTimeout(finish, 1600);
    });
  }
  return new Promise<void>((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
    if ("decode" in img) {
      img.decode().then(finish).catch(finish);
    }
    window.setTimeout(finish, 1200);
  });
}

function preloadElementAsset(item: SelectedElement) {
  if (!item.assetUrl) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = item.assetUrl || "";
    if ("decode" in img) {
      img.decode().then(finish).catch(finish);
    }
    window.setTimeout(finish, 1000);
  });
}

function mapMediaSearchAsset(row: Record<string, unknown>): VisualAsset | null {
  const kind = String(row.kind || "").toLowerCase();
  if (kind !== "video" && kind !== "photo") return null;
  const provider = String(row.provider || row.providerLabel || "media");
  const id = String(row.id || `${provider}-${kind}`);
  return {
    id,
    key: `${provider}:${kind}:${id}`,
    kind,
    provider,
    title: String(row.title || `${kind} ${id}`),
    author: row.author ? String(row.author) : null,
    thumb: row.thumb ? String(row.thumb) : null,
    previewUrl: row.previewUrl ? String(row.previewUrl) : null,
    downloadUrl: row.downloadUrl ? String(row.downloadUrl) : null,
    durationSec:
      row.durationSec != null && Number.isFinite(Number(row.durationSec))
        ? Number(row.durationSec)
        : null,
    width:
      row.width != null && Number.isFinite(Number(row.width))
        ? Number(row.width)
        : null,
    height:
      row.height != null && Number.isFinite(Number(row.height))
        ? Number(row.height)
        : null,
  };
}

function mapUnsplashAsset(row: Record<string, unknown>): VisualAsset | null {
  const urls = row.urls as
    | { regular?: string; small?: string; full?: string; thumb?: string }
    | undefined;
  const photographer = row.photographer as
    | { name?: string }
    | undefined;
  const id = String(row.id || "");
  if (!id || !urls) return null;
  return {
    id,
    key: `unsplash:photo:${id}`,
    kind: "photo",
    provider: "unsplash",
    title: String(row.description || row.alt || "Unsplash photo"),
    author: photographer?.name || "Unsplash",
    thumb: urls.small || urls.thumb || urls.regular || null,
    previewUrl: urls.regular || urls.full || urls.small || null,
    downloadUrl: urls.full || urls.regular || null,
    durationSec: null,
    width:
      row.width != null && Number.isFinite(Number(row.width))
        ? Number(row.width)
        : null,
    height:
      row.height != null && Number.isFinite(Number(row.height))
        ? Number(row.height)
        : null,
  };
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
  return "/dashboard/content?tab=library";
}

function overlayTextClass(style: (typeof TEXT_STYLES)[number]["id"]) {
  switch (style) {
    case "hook_top":
    case "top_banner":
    case "mega_top":
    case "thin_top":
    case "box_top":
    case "word_top":
    case "tiny_top":
      return "absolute inset-x-4 top-[10%] text-center";
    case "caption_bottom":
    case "box_lower":
    case "bottom_wide":
    case "soft_caption":
    case "kinetic_low":
    case "word_low":
    case "serif_bottom":
    case "thin_bottom":
    case "impact_low":
    case "cta_bottom":
    case "subtitle_safe":
      return "absolute inset-x-4 bottom-[12%] text-center";
    case "slide_left_title":
    case "mid_left":
    case "side_stack_l":
    case "credit_left":
    case "float_ul":
    case "float_ll":
      return "absolute left-4 top-1/2 max-w-[72%] -translate-y-1/2 text-left";
    case "slide_right_title":
    case "mid_right":
    case "side_stack_r":
    case "credit_right":
    case "float_ur":
    case "float_lr":
      return "absolute right-4 top-1/2 max-w-[72%] -translate-y-1/2 text-right";
    default:
      return "absolute inset-x-4 top-1/2 -translate-y-1/2 text-center";
  }
}

function overlayTextStyle(style: (typeof TEXT_STYLES)[number]["id"]): CSSProperties {
  const base: CSSProperties = {
    fontWeight: 850,
    textShadow: "0 2px 10px rgba(0,0,0,0.85)",
  };
  if (style.includes("serif")) {
    base.fontFamily = "Georgia, serif";
    base.fontWeight = 650;
  }
  if (style.includes("box") || style.includes("banner")) {
    return {
      ...base,
      color: "#fff",
      background: "rgba(0,0,0,0.58)",
      borderRadius: 8,
      padding: "8px 12px",
      display: "inline-block",
      fontSize: "clamp(0.9rem, 3.2vw, 1.35rem)",
    };
  }
  if (style.includes("gold") || style === "hook_top" || style.includes("cta")) {
    return {
      ...base,
      color: "#ffd45d",
      fontSize: "clamp(1rem, 3.8vw, 1.65rem)",
    };
  }
  if (style.includes("neon")) {
    return {
      ...base,
      color: "#77f7ff",
      textShadow: "0 0 14px rgba(18,211,255,0.85), 0 2px 8px #000",
      fontSize: "clamp(1rem, 3.8vw, 1.65rem)",
    };
  }
  return {
    ...base,
    color: "#fff",
    fontSize: "clamp(1rem, 4vw, 1.75rem)",
    letterSpacing: "0",
  };
}


function includesQuery(value: string | null | undefined, query: string) {
  if (!query.trim()) return true;
  return String(value || "").toLowerCase().includes(query.trim().toLowerCase());
}

function normalizeSceneDuration(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0.5, Math.min(120, n));
}

function ButtonIcon({
  children,
  label,
  onClick,
  active,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition disabled:opacity-45"
      style={{
        borderColor: active ? "rgba(138,0,212,0.42)" : LINE,
        color: active ? ACCENT : "#374151",
        background: active ? "rgba(138,0,212,0.08)" : SURFACE,
      }}
    >
      {children}
    </button>
  );
}

function ToolIcon({ id }: { id: ToolId }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (id) {
    case "visuals":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m4 16 4.2-4 3.2 3 2.4-2.3L20 17" />
        </svg>
      );
    case "audio":
      return (
        <svg {...common}>
          <path d="M4 14v-4" />
          <path d="M8 17V7" />
          <path d="M12 20V4" />
          <path d="M16 17V7" />
          <path d="M20 14v-4" />
        </svg>
      );
    case "voice":
      return (
        <svg {...common}>
          <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
          <path d="M12 18v3" />
          <path d="M9 21h6" />
        </svg>
      );
    case "layouts":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="16" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <path d="M5 6h14" />
          <path d="M12 6v12" />
          <path d="M9 18h6" />
        </svg>
      );
    case "elements":
      return (
        <svg {...common}>
          <path d="M12 3 14.5 9.3 21 12l-6.5 2.7L12 21l-2.5-6.3L3 12l6.5-2.7L12 3Z" />
        </svg>
      );
    case "style":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 9 9c0-1.2-.8-2-2-2h-1.2c-.9 0-1.5-.8-1.2-1.7.3-.9.2-1.8-.5-2.5A5.7 5.7 0 0 0 12 3Z" />
          <circle cx="7.8" cy="11" r=".7" />
          <circle cx="10.2" cy="7.8" r=".7" />
          <circle cx="14" cy="7.8" r=".7" />
        </svg>
      );
    case "subtitles":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M7 13h4" />
          <path d="M13 13h4" />
          <path d="M7 16h7" />
        </svg>
      );
    case "frames":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      );
    default:
      return null;
  }
}

function MiniIcon({
  name,
}: {
  name: "play" | "pause" | "search" | "export" | "plus" | "replace" | "check";
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "play") {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M8 5v14l11-7-11-7Z" />
      </svg>
    );
  }
  if (name === "pause") {
    return (
      <svg {...common}>
        <path d="M9 5v14" />
        <path d="M15 5v14" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }
  if (name === "replace") {
    return (
      <svg {...common}>
        <path d="M7 7h10v10" />
        <path d="M17 7 7 17" />
        <path d="M7 17h10" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <MiniIcon name="search" />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[color:rgba(138,0,212,0.45)]"
        style={{ borderColor: LINE }}
      />
    </label>
  );
}

function PanelHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      {children && <p className="mt-1 text-xs leading-relaxed text-gray-500">{children}</p>}
    </div>
  );
}

function StickyPanelTop({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`sticky top-0 z-30 isolate -mx-5 -mt-5 border-b bg-white px-5 before:pointer-events-none before:absolute before:inset-x-0 before:-top-16 before:h-16 before:bg-white after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-5 after:h-5 after:bg-gradient-to-b after:from-white after:to-transparent ${
        compact ? "pb-3 pt-5" : "pb-4 pt-5"
      }`}
      style={{
        borderColor: LINE,
        boxShadow:
          "0 14px 24px rgba(255,255,255,0.96), 0 1px 0 rgba(17,24,39,0.04)",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        {title}
      </p>
      {action}
    </div>
  );
}

function StyleTile({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-lg border p-2 text-left transition hover:border-[color:rgba(138,0,212,0.35)]"
      style={{
        borderColor: active ? "rgba(138,0,212,0.55)" : LINE,
        background: active ? "rgba(138,0,212,0.07)" : SURFACE,
        boxShadow: active ? "0 0 0 2px rgba(138,0,212,0.08)" : undefined,
      }}
    >
      <div className="mb-2 h-12 overflow-hidden rounded-md bg-gray-100">
        {children || (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827,#8a00d4_54%,#e8a54b)]" />
        )}
      </div>
      <p className="truncate text-xs font-semibold text-gray-800">{label}</p>
    </button>
  );
}

function SourceThumb({
  clip,
  fallback,
  videoSrc,
  label,
}: {
  clip?: SourceClip;
  fallback?: string | null;
  videoSrc?: string;
  label?: string;
}) {
  const color = clip?.color
    ? clip.color.startsWith("#")
      ? clip.color
      : `#${clip.color}`
    : "#111827";
  const image = clip?.thumb || fallback || null;
  if (image) {
    return (
      <span
        className="block h-full w-full bg-cover bg-center"
        style={{
          backgroundColor: color,
          backgroundImage: `url(${image})`,
        }}
      />
    );
  }
  if (videoSrc) {
    return (
      <video
        src={videoSrc}
        muted
        playsInline
        preload="metadata"
        className="block h-full w-full bg-gray-900 object-cover"
        aria-label={label}
      />
    );
  }
  return (
    <span
      className="flex h-full w-full items-center justify-center bg-cover bg-center text-xs font-semibold text-white/75"
      style={{
        backgroundColor: color,
        backgroundImage: previewGradient(label || clip?.label || "scene", true),
      }}
    >
      {(label || clip?.label || "Video").slice(0, 18)}
    </span>
  );
}

export function VideoEditorStudio({ job }: { job: VideoJob }) {
  const router = useRouter();
  const t = useTranslations("studio.videoEditor");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const { show: toast, notice } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const visualSentinelRef = useRef<HTMLDivElement | null>(null);
  const elementsSentinelRef = useRef<HTMLDivElement | null>(null);
  const voicesSentinelRef = useRef<HTMLDivElement | null>(null);
  const visualRequestRef = useRef(0);
  const elementsRequestRef = useRef(0);
  const voicesRequestRef = useRef(0);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const meta = (job.metadata || {}) as Record<string, unknown>;
  const initialEffect = (() => {
    const v = String(meta.visual_effect || meta.effect || "cinematic");
    return EFFECTS.some((e) => e.id === v)
      ? (v as (typeof EFFECTS)[number]["id"])
      : "cinematic";
  })();
  const initialSub = (() => {
    const v = String(meta.subtitle_style || "classic");
    return SUBTITLE_STYLES.some((s) => s.id === v)
      ? (v as (typeof SUBTITLE_STYLES)[number]["id"])
      : "classic";
  })();
  const initialTransition = (() => {
    const v = String(meta.preferred_transition || "fade");
    return TRANSITIONS.some((tr) => tr.id === v)
      ? (v as (typeof TRANSITIONS)[number]["id"])
      : "fade";
  })();

  const [tool, setTool] = useState<ToolId>("visuals");
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
  const initialFrame = (() => {
    const v = String(meta.frame_style || "");
    return isVideoFrameId(v) ? v : "";
  })();
  const [frameStyle, setFrameStyle] = useState<string>(initialFrame);
  const [overlayText, setOverlayText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [musicMode, setMusicMode] = useState<"none" | "auto" | "track">("auto");
  const [musicTrackId, setMusicTrackId] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.45);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicDraftQuery, setMusicDraftQuery] = useState("");
  const [voiceId, setVoiceId] = useState(String(meta.voice_id || ""));
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceDraftQuery, setVoiceDraftQuery] = useState("");
  const [voiceGender, setVoiceGender] = useState<GenderFilter>("all");
  const [keepOriginal, setKeepOriginal] = useState(meta.keep_original_audio !== false);
  const [voiceVolume, setVoiceVolume] = useState(
    Number(meta.voice_volume) > 0 ? Number(meta.voice_volume) : 1.05,
  );
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(
    String(meta.aspect_ratio || "9:16"),
  );
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
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesLoadingMore, setVoicesLoadingMore] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [voicesPage, setVoicesPage] = useState(1);
  const [voicesHasMore, setVoicesHasMore] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const excludedSources = useMemo(() => new Set<string>(), []);
  const [visualQuery, setVisualQuery] = useState("");
  const [visualFilter, setVisualFilter] = useState<VisualFilter>("all");
  const [visualItems, setVisualItems] = useState<VisualAsset[]>([]);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualLoadingMore, setVisualLoadingMore] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualPage, setVisualPage] = useState(1);
  const [visualHasMore, setVisualHasMore] = useState(true);
  const [selectedMediaByScene, setSelectedMediaByScene] = useState<
    Record<string, VisualAsset>
  >({});
  const [addedSceneIds, setAddedSceneIds] = useState<string[]>([]);
  const [addedSceneLabels, setAddedSceneLabels] = useState<Record<string, string>>({});
  const [applyingMediaKey, setApplyingMediaKey] = useState<string | null>(null);
  const [panelQuery, setPanelQuery] = useState("");
  const [elementQuery, setElementQuery] = useState("");
  const [elementItems, setElementItems] = useState<SelectedElement[]>([]);
  const [applyingElementKey, setApplyingElementKey] = useState<string | null>(null);
  const [elementColor, setElementColor] = useState("#8a00d4");
  const [elementBackground, setElementBackground] = useState("#ffffff");
  const [elementSize, setElementSize] = useState(1);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsLoadingMore, setElementsLoadingMore] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [elementsPage, setElementsPage] = useState(1);
  const [elementsHasMore, setElementsHasMore] = useState(true);
  const [styleQuery, setStyleQuery] = useState("");
  const [styleCategory, setStyleCategory] = useState<StyleCategory>("looks");
  const [sceneDurations, setSceneDurations] = useState<Record<string, number>>({});
  const [sceneMotions, setSceneMotions] = useState<Record<string, string>>({});
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const [captionScale, setCaptionScale] = useState(1);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [tool]);

  const initialSources = useMemo(() => {
    const raw = meta.source_clips;
    if (!Array.isArray(raw)) return [] as SourceClip[];
    return raw
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x, i) => ({
        id: String(x.id || `src-${i}`),
        originalIndex: Number.isFinite(Number(x.original_index))
          ? Number(x.original_index)
          : i,
        provider: x.provider ? String(x.provider) : undefined,
        kind: x.kind ? String(x.kind) : undefined,
        thumb: x.thumb ? String(x.thumb) : null,
        label: x.label
          ? String(x.label)
          : x.query
            ? String(x.query)
            : `Clip ${i + 1}`,
        query: x.query ? String(x.query) : undefined,
        color: x.color ? String(x.color) : undefined,
        duration_seconds:
          x.duration_seconds != null ? Number(x.duration_seconds) : null,
      }));
  }, [meta.source_clips]);

  const visibleSources = useMemo(
    () => initialSources.filter((source) => !excludedSources.has(source.id)),
    [initialSources, excludedSources],
  );

  const backHref = useMemo(() => parentReturnPath(job), [job]);
  const previewSrc = `/api/jobs/${job.id}/preview`;
  const effectCss = EFFECTS.find((item) => item.id === effect)?.css || "none";
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

  const selectedSceneMotion = selectedSceneId
    ? sceneMotions[selectedSceneId] || motion
    : motion;
  const previewTransform = useMemo(() => {
    const transforms: string[] = [];
    if (flipH) transforms.push("scaleX(-1)");
    if (flipV) transforms.push("scaleY(-1)");
    if (zoom > 1.01) transforms.push(`scale(${zoom})`);
    if (selectedSceneMotion.includes("push") || selectedSceneMotion.includes("zoom")) {
      transforms.push("scale(1.045)");
    }
    if (selectedSceneMotion.includes("pull")) transforms.push("scale(0.97)");
    if (selectedSceneMotion.includes("left")) transforms.push("translateX(-2%) scale(1.035)");
    if (selectedSceneMotion.includes("right")) transforms.push("translateX(2%) scale(1.035)");
    if (selectedSceneMotion.includes("rise") || selectedSceneMotion.includes("up")) {
      transforms.push("translateY(-2%) scale(1.03)");
    }
    if (selectedSceneMotion.includes("down") || selectedSceneMotion.includes("drop")) {
      transforms.push("translateY(2%) scale(1.03)");
    }
    if (selectedSceneMotion.includes("shake") || selectedSceneMotion.includes("jitter")) {
      transforms.push("rotate(-0.7deg) scale(1.04)");
    }
    return transforms.length ? transforms.join(" ") : undefined;
  }, [flipH, flipV, selectedSceneMotion, zoom]);

  const baseSceneIds = useMemo(() => {
    if (visibleSources.length > 0) return visibleSources.map((source) => source.id);
    return Array.from({ length: Math.min(6, Math.max(3, thumbs.length || 5)) }, (_, i) => `scene-${i + 1}`);
  }, [thumbs.length, visibleSources]);

  const timelineTitle = useMemo(() => {
    return String(job.title || "Video").replace(/\s+\(edit\)$/i, "").trim() || "Video";
  }, [job.title]);

  const allSceneIds = useMemo(
    () => [...baseSceneIds, ...addedSceneIds],
    [addedSceneIds, baseSceneIds],
  );

  useEffect(() => {
    const rawDurations = Array.isArray(meta.scene_durations)
      ? (meta.scene_durations as unknown[])
      : [];
    setSceneDurations((prev) => {
      const next = { ...prev };
      const fallback = duration / Math.max(1, baseSceneIds.length);
      baseSceneIds.forEach((id, index) => {
        if (next[id] != null) return;
        const raw = rawDurations[index];
        const rawValue =
          raw && typeof raw === "object" && "duration" in raw
            ? (raw as { duration?: unknown }).duration
            : raw;
        const sourceDuration =
          visibleSources.find((source) => source.id === id)?.duration_seconds ??
          null;
        next[id] = normalizeSceneDuration(rawValue ?? sourceDuration, fallback);
      });
      addedSceneIds.forEach((id) => {
        if (next[id] != null) return;
        const asset = selectedMediaByScene[id];
        next[id] = normalizeSceneDuration(asset?.durationSec, 5);
      });
      Object.keys(next).forEach((id) => {
        if (!allSceneIds.includes(id)) delete next[id];
      });
      return next;
    });
    setSelectedSceneId((prev) => (prev && allSceneIds.includes(prev) ? prev : allSceneIds[0] || ""));
  }, [
    addedSceneIds,
    allSceneIds,
    baseSceneIds,
    duration,
    meta.scene_durations,
    selectedMediaByScene,
    visibleSources,
  ]);

  const timelineScenes = useMemo<TimelineScene[]>(() => {
    const addedScenes = addedSceneIds.map((id, extraIndex) => {
      const item = selectedMediaByScene[id];
      return {
        id,
        label: addedSceneLabels[id] || item?.title || `Added ${extraIndex + 1}`,
        thumb: item?.thumb || item?.previewUrl || currentFrame || null,
        duration: normalizeSceneDuration(sceneDurations[id], item?.durationSec || 5),
        originalIndex: baseSceneIds.length + extraIndex,
        selectedMedia: item,
        generated: true,
      };
    });
    if (visibleSources.length > 0) {
      const fallback = duration / Math.max(1, visibleSources.length);
      return [
        ...visibleSources.map((source, index) => ({
          id: source.id,
          label: cleanSceneLabel(
            source.label || source.query || source.kind,
            timelineTitle,
            index,
          ),
          thumb:
            selectedMediaByScene[source.id]?.thumb ||
            selectedMediaByScene[source.id]?.previewUrl ||
            source.thumb ||
            thumbs[index % Math.max(1, thumbs.length)] ||
            null,
          duration: normalizeSceneDuration(sceneDurations[source.id], fallback),
          originalIndex: source.originalIndex ?? index,
          selectedMedia: selectedMediaByScene[source.id],
          source,
        })),
        ...addedScenes,
      ];
    }
    const count = Math.min(6, Math.max(3, thumbs.length || 5));
    const fallback = duration / count;
    const generatedScenes = Array.from({ length: count }, (_, index) => {
      const id = `scene-${index + 1}`;
      return {
        id,
        label: cleanSceneLabel(null, timelineTitle, index),
        thumb:
          selectedMediaByScene[id]?.thumb ||
          selectedMediaByScene[id]?.previewUrl ||
          thumbs[index % Math.max(1, thumbs.length)] ||
          currentFrame ||
          null,
        duration: normalizeSceneDuration(sceneDurations[id], fallback),
        originalIndex: index,
        selectedMedia: selectedMediaByScene[id],
        generated: true,
      };
    });
    return [...generatedScenes, ...addedScenes];
  }, [
    addedSceneIds,
    addedSceneLabels,
    baseSceneIds.length,
    currentFrame,
    duration,
    sceneDurations,
    selectedMediaByScene,
    thumbs,
    timelineTitle,
    visibleSources,
  ]);

  const totalSceneDuration = useMemo(
    () => timelineScenes.reduce((sum, scene) => sum + scene.duration, 0),
    [timelineScenes],
  );

  const selectedScene = useMemo(
    () => timelineScenes.find((scene) => scene.id === selectedSceneId) || timelineScenes[0] || null,
    [selectedSceneId, timelineScenes],
  );
  const selectedSceneMedia = selectedScene
    ? selectedMediaByScene[selectedScene.id] || null
    : null;
  const liveCaptionText =
    captionText.trim() || (captionsVisible ? selectedScene?.label || "" : "");

  const filteredEffects = useMemo(
    () => EFFECTS.filter((item) => includesQuery(item.label, styleQuery)),
    [styleQuery],
  );

  const filteredMotions = useMemo(
    () => MOTIONS.filter((item) => includesQuery(item.label, styleQuery)),
    [styleQuery],
  );

  const filteredTransitions = useMemo(
    () => TRANSITIONS.filter((item) => includesQuery(item.label, styleQuery)),
    [styleQuery],
  );

  const filteredTextStyles = useMemo(
    () => TEXT_STYLES.filter((item) => includesQuery(item.label, panelQuery)),
    [panelQuery],
  );

  const filteredSubtitleStyles = useMemo(
    () => SUBTITLE_STYLES.filter((item) => includesQuery(item.label, panelQuery)),
    [panelQuery],
  );

  const filteredFrames = useMemo(
    () => VIDEO_FRAMES.filter((item) => includesQuery(item.label, panelQuery)),
    [panelQuery],
  );

  const visualSuggestions = useMemo(() => {
    const words = visualQuery.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return words.map((_, index) => words.slice(0, index + 1).join(" "));
  }, [visualQuery]);

  const filteredElements = useMemo(() => {
    const fallback = [...ELEMENT_EMOJIS, ...ELEMENT_ICONS].filter((item) =>
      includesQuery(`${item.label} ${item.symbol}`, elementQuery),
    );
    const remote = elementItems.filter((item) =>
      includesQuery(`${item.label} ${item.symbol} ${item.provider || ""}`, elementQuery),
    );
    return remote.length > 0 ? remote : fallback;
  }, [elementItems, elementQuery]);

  const loadVisualPage = useCallback(
    async (page: number, append = false) => {
      const reqId = append
        ? visualRequestRef.current
        : ++visualRequestRef.current;
      if (append) setVisualLoadingMore(true);
      else {
        setVisualLoading(true);
        setVisualError(null);
      }
      const q = smartSearchQuery(visualQuery, "cinematic creator");
      const orientation = visualOrientation(aspectRatio);
      const wantVideo = visualFilter === "all" || visualFilter === "video";
      const wantPhoto = visualFilter === "all" || visualFilter === "photo";
      const calls: Array<Promise<{ items: VisualAsset[]; hasMore: boolean }>> = [];

      if (wantVideo) {
        calls.push(
          fetch(
            `/api/media/search?${new URLSearchParams({
              type: "video",
              q,
              page: String(page),
              orientation,
            })}`,
            { cache: "no-store" },
          )
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (!res.ok) throw new Error(data.error || "Video search failed");
              return {
                items: ((data.items || []) as Record<string, unknown>[])
                  .map(mapMediaSearchAsset)
                  .filter((item): item is VisualAsset => Boolean(item)),
                hasMore: Boolean(data.hasMore),
              };
            }),
        );
      }

      if (wantPhoto) {
        calls.push(
          fetch(
            `/api/media/search?${new URLSearchParams({
              type: "photo",
              q,
              page: String(page),
              orientation,
            })}`,
            { cache: "no-store" },
          )
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (!res.ok) throw new Error(data.error || "Photo search failed");
              return {
                items: ((data.items || []) as Record<string, unknown>[])
                  .map(mapMediaSearchAsset)
                  .filter((item): item is VisualAsset => Boolean(item)),
                hasMore: Boolean(data.hasMore),
              };
            }),
        );
        calls.push(
          fetch(
            `/api/unsplash/photos?${new URLSearchParams({
              q,
              page: String(page),
              perPage: "24",
            })}`,
            { cache: "no-store" },
          )
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (!res.ok) return { items: [] as VisualAsset[], hasMore: false };
              return {
                items: ((data.items || []) as Record<string, unknown>[])
                  .map(mapUnsplashAsset)
                  .filter((item): item is VisualAsset => Boolean(item)),
                hasMore: Boolean(data.hasMore),
              };
            }),
        );
      }

      const settled = await Promise.allSettled(calls);
      if (reqId !== visualRequestRef.current) return;
      const ok = settled
        .filter(
          (
            item,
          ): item is PromiseFulfilledResult<{
            items: VisualAsset[];
            hasMore: boolean;
          }> => item.status === "fulfilled",
        )
        .map((item) => item.value);
      const groups = ok.map((item) => item.items);
      const failed = settled.filter((item) => item.status === "rejected");
      setVisualItems((prev) =>
        append ? mergeVisualAssets(prev, ...groups) : mergeVisualAssets(...groups),
      );
      setVisualPage(page);
      setVisualHasMore(ok.some((item) => item.hasMore));
      setVisualError(
        ok.length === 0 && failed.length > 0 ? "Media sources unavailable" : null,
      );
      setVisualLoading(false);
      setVisualLoadingMore(false);
    },
    [aspectRatio, visualFilter, visualQuery],
  );

  const loadElementsPage = useCallback(
    async (page: number, append = false) => {
      const reqId = append
        ? elementsRequestRef.current
        : ++elementsRequestRef.current;
      if (append) setElementsLoadingMore(true);
      else {
        setElementsLoading(true);
        setElementsError(null);
      }
      const q = smartSearchQuery(elementQuery, "");
      const emojiParams = new URLSearchParams({
        page: String(page),
        limit: "96",
      });
      if (q) emojiParams.set("q", q);
      const iconParams = new URLSearchParams({
        page: String(page),
        limit: "96",
      });
      if (q) iconParams.set("q", q);
      else iconParams.set("prefix", "lucide");

      const [emojiRes, iconRes] = await Promise.allSettled([
        fetch(`/api/openmoji?${emojiParams}`, { cache: "no-store" })
          .then((res) => res.json().then((data) => ({ res, data })))
          .then(({ res, data }) => {
            if (!res.ok) throw new Error(data.error || "Emoji failed");
            return {
              items: ((data.items || []) as Record<string, unknown>[]).map(
                (row) => ({
                  kind: "emoji" as const,
                  label: String(row.name || row.filename || row.hex || "Emoji"),
                  symbol: "",
                  assetUrl: row.public_url ? String(row.public_url) : null,
                  sourceId: row.hex ? String(row.hex) : null,
                  provider: "OpenMoji",
                }),
              ),
              hasMore: Boolean(data.hasMore),
            };
          }),
        fetch(`/api/iconify/icons?${iconParams}`, { cache: "no-store" })
          .then((res) => res.json().then((data) => ({ res, data })))
          .then(({ res, data }) => {
            if (!res.ok) throw new Error(data.error || "Icons failed");
            return {
              items: ((data.items || []) as Record<string, unknown>[]).map(
                (row) => ({
                  kind: "icon" as const,
                  label: String(row.label || row.name || row.id || "Icon"),
                  symbol: "",
                  assetUrl: row.svgUrl ? String(row.svgUrl) : null,
                  sourceId: row.id ? String(row.id) : null,
                  provider: "Iconify",
                }),
              ),
              hasMore: Boolean(data.hasMore),
            };
          }),
      ]);

      if (reqId !== elementsRequestRef.current) return;
      const batches: SelectedElement[][] = [];
      const hasMore: boolean[] = [];
      if (emojiRes.status === "fulfilled") {
        batches.push(emojiRes.value.items);
        hasMore.push(emojiRes.value.hasMore);
      }
      if (iconRes.status === "fulfilled") {
        batches.push(iconRes.value.items);
        hasMore.push(iconRes.value.hasMore);
      }
      const next = batches.flat();
      setElementItems((prev) => (append ? mergeElements(prev, next) : next));
      setElementsPage(page);
      setElementsHasMore(hasMore.some(Boolean));
      setElementsError(
        !append && next.length === 0 ? "Element library unavailable" : null,
      );
      setElementsLoading(false);
      setElementsLoadingMore(false);
    },
    [elementQuery],
  );

  const loadVoicePage = useCallback(
    async (page: number, append = false) => {
      const reqId = append
        ? voicesRequestRef.current
        : ++voicesRequestRef.current;
      if (append) setVoicesLoadingMore(true);
      else {
        setVoicesLoading(true);
        setVoicesError(null);
      }
      const params = new URLSearchParams({
        page: String(page),
        limit: "80",
      });
      if (voiceQuery.trim()) params.set("q", smartSearchQuery(voiceQuery, ""));
      if (voiceGender !== "all") params.set("gender", voiceGender);

      try {
        const res = await fetch(`/api/elevenlabs/voices?${params}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (reqId !== voicesRequestRef.current) return;
        if (!res.ok) {
          if (!append) setVoices([]);
          setVoicesError(data.error || "Voice library unavailable");
          setVoicesHasMore(false);
          return;
        }
        const next = (data.voices || []) as VoiceItem[];
        setVoices((prev) => (append ? mergeVoices(prev, next) : next));
        setVoicesPage(page);
        setVoicesHasMore(Boolean(data.hasMore));
        setVoicesError(null);
      } catch {
        if (!append) setVoices([]);
        setVoicesError("Voice library unavailable");
        setVoicesHasMore(false);
      } finally {
        setVoicesLoading(false);
        setVoicesLoadingMore(false);
      }
    },
    [voiceGender, voiceQuery],
  );

  useEffect(() => {
    if (tool !== "visuals") return;
    const timer = window.setTimeout(() => {
      void loadVisualPage(1, false);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [loadVisualPage, tool]);

  useEffect(() => {
    if (tool !== "elements") return;
    const timer = window.setTimeout(() => {
      void loadElementsPage(1, false);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [loadElementsPage, tool]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVoiceQuery(voiceDraftQuery.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [voiceDraftQuery]);

  useEffect(() => {
    if (tool !== "voice") return;
    const timer = window.setTimeout(() => {
      void loadVoicePage(1, false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadVoicePage, tool]);

  useEffect(() => {
    if (tool !== "visuals") return;
    const root = panelRef.current;
    const target = visualSentinelRef.current;
    if (!root || !target || !visualHasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (visualLoading || visualLoadingMore || !visualHasMore) return;
        void loadVisualPage(visualPage + 1, true);
      },
      { root, rootMargin: "420px 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    loadVisualPage,
    tool,
    visualHasMore,
    visualLoading,
    visualLoadingMore,
    visualPage,
  ]);

  useEffect(() => {
    if (tool !== "elements") return;
    const root = panelRef.current;
    const target = elementsSentinelRef.current;
    if (!root || !target || !elementsHasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (elementsLoading || elementsLoadingMore || !elementsHasMore) return;
        void loadElementsPage(elementsPage + 1, true);
      },
      { root, rootMargin: "420px 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    elementsHasMore,
    elementsLoading,
    elementsLoadingMore,
    elementsPage,
    loadElementsPage,
    tool,
  ]);

  useEffect(() => {
    if (tool !== "voice") return;
    const root = panelRef.current;
    const target = voicesSentinelRef.current;
    if (!root || !target || !voicesHasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (voicesLoading || voicesLoadingMore || !voicesHasMore) return;
        void loadVoicePage(voicesPage + 1, true);
      },
      { root, rootMargin: "420px 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    loadVoicePage,
    tool,
    voicesHasMore,
    voicesLoading,
    voicesLoadingMore,
    voicesPage,
  ]);

  useEffect(() => {
    return () => {
      voiceAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  function applyLookPack(pack: (typeof LOOK_PACKS)[number]) {
    setActivePack(pack.id);
    setEffect(pack.effect);
    setMotion(pack.motion);
    if (selectedSceneId) {
      setSceneMotions((prev) => ({ ...prev, [selectedSceneId]: pack.motion }));
    }
    setSubtitleStyle(pack.subtitle);
    setTransition(pack.transition);
    setPlaybackSpeed(pack.speed);
    setContrast(pack.contrast);
    setSaturation(pack.saturation);
    setBrightness("brightness" in pack ? Number(pack.brightness) || 0 : 0);
  }

  const loadMusic = useCallback(async (query: string) => {
    setMusicLoading(true);
    const params = new URLSearchParams({
      q: query,
      page: "1",
      pageSize: "200",
    });
    const res = await fetch(
      `/api/music/tracks?${params}`,
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
        artist?: string | null;
        mood?: string | null;
        genreName?: string | null;
        durationSec?: number | null;
        previewUrl?: string | null;
      }>).map((track) => ({
        id: String(track.id),
        title: track.title || `Track #${track.id}`,
        author: track.artist || track.genreName || "Music library",
        previewUrl: track.previewUrl || null,
        durationSec: track.durationSec ?? null,
        mood: track.mood || null,
        genreName: track.genreName || null,
      })),
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMusicQuery(musicDraftQuery.trim());
    }, 260);
    return () => window.clearTimeout(timer);
  }, [musicDraftQuery]);

  useEffect(() => {
    void loadMusic(musicQuery);
    return () => {
      musicRef.current?.pause();
    };
  }, [loadMusic, musicQuery]);

  const onLoadedMeta = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = video.duration;
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
      setTrimEnd((prev) => (prev <= 0 || prev > nextDuration ? nextDuration : prev));
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function tick() {
      const time = video!.currentTime || 0;
      setCurrent(time);
      if (time >= trimEnd - 0.05) {
        if (loopPreview) {
          video!.currentTime = trimStart;
          setCurrent(trimStart);
          return;
        }
        video!.pause();
        setPlaying(false);
        video!.currentTime = trimStart;
        setCurrent(trimStart);
      }
    }
    video.addEventListener("timeupdate", tick);
    return () => video.removeEventListener("timeupdate", tick);
  }, [loopPreview, trimEnd, trimStart]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }
    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
    }
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function seekTo(ratio: number) {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    const time = Math.max(trimStart, Math.min(trimEnd, ratio * duration));
    video.currentTime = time;
    setCurrent(time);
  }

  function seekToScene(scene: TimelineScene) {
    const before = timelineScenes
      .slice(0, timelineScenes.findIndex((item) => item.id === scene.id))
      .reduce((sum, item) => sum + item.duration, 0);
    const ratio = totalSceneDuration > 0 ? before / totalSceneDuration : 0;
    setSelectedSceneId(scene.id);
    seekTo(ratio);
  }

  function setSceneDuration(sceneId: string, durationValue: number) {
    setSceneDurations((prev) => {
      return {
        ...prev,
        [sceneId]: Math.max(
          0.5,
          Math.min(120, Number(durationValue.toFixed(1))),
        ),
      };
    });
  }

  function beginSceneResize(
    scene: TimelineScene,
    edge: "left" | "right",
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedSceneId(scene.id);
    const startX = event.clientX;
    const startDuration = scene.duration;
    const direction = edge === "right" ? 1 : -1;

    function onMove(moveEvent: PointerEvent) {
      const deltaSeconds = (moveEvent.clientX - startX) * 0.055 * direction;
      setSceneDuration(scene.id, startDuration + deltaSeconds);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  async function applyVisualAsset(asset: VisualAsset, mode: "replace" | "add") {
    const key = `${mode}:${asset.key}`;
    setApplyingMediaKey(key);
    try {
      await preloadVisualAsset(asset);
      if (mode === "add") {
        const id = `added-${Date.now()}-${asset.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
        setAddedSceneIds((prev) => [...prev, id]);
        setAddedSceneLabels((prev) => ({ ...prev, [id]: asset.title }));
        setSceneDurations((prev) => ({
          ...prev,
          [id]: normalizeSceneDuration(asset.durationSec, 5),
        }));
        setSelectedMediaByScene((prev) => ({ ...prev, [id]: asset }));
        setSelectedSceneId(id);
        return;
      }
      const target = selectedScene || timelineScenes[0];
      if (!target) return;
      setSelectedMediaByScene((prev) => ({ ...prev, [target.id]: asset }));
      setSelectedSceneId(target.id);
    } finally {
      setApplyingMediaKey(null);
    }
  }

  async function applyElement(item: SelectedElement) {
    const key = elementKey(item);
    setApplyingElementKey(key);
    try {
      await preloadElementAsset(item);
      const active =
        selectedElement?.kind === item.kind &&
        selectedElement?.label === item.label &&
        selectedElement?.assetUrl === item.assetUrl;
      setSelectedElement(active ? null : item);
    } finally {
      setApplyingElementKey(null);
    }
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

  function chooseVoice(voice: VoiceItem) {
    setLoadingVoiceId(voice.id);
    window.setTimeout(() => {
      setVoiceId(voice.id);
      setKeepOriginal(false);
      setLoadingVoiceId(null);
    }, 140);
  }

  async function toggleVoicePreview(voice: VoiceItem) {
    if (playingVoiceId === voice.id) {
      voiceAudioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }
    voiceAudioRef.current?.pause();
    setLoadingVoiceId(voice.id);
    try {
      let src = voice.preview_url;
      if (!src) {
        const res = await fetch(
          `/api/elevenlabs/preview?voiceId=${encodeURIComponent(voice.id)}`,
          { cache: "no-store" },
        );
        const type = res.headers.get("content-type") || "";
        if (type.includes("audio")) {
          src = URL.createObjectURL(await res.blob());
        } else {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Voice preview failed");
          src = data.previewUrl || null;
        }
      }
      if (!src) throw new Error("Voice preview unavailable");
      const audio = new Audio(src);
      voiceAudioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      await audio.play();
      setPlayingVoiceId(voice.id);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Voice preview failed",
        "error",
      );
      setPlayingVoiceId(null);
    } finally {
      setLoadingVoiceId(null);
    }
  }

  async function onExport() {
    if (exporting) return;
    if (trimEnd - trimStart < 0.5) {
      toast(t("trimTooShort"), "error");
      return;
    }
    setExporting(true);
    musicRef.current?.pause();
    videoRef.current?.pause();
    setPlaying(false);

    const sourceClips = visibleSources.map((source) => {
      const { originalIndex, ...metadataSource } = source;
      return {
        ...metadataSource,
        original_index: originalIndex ?? null,
        duration_seconds:
          sceneDurations[source.id] ||
          timelineScenes.find((scene) => scene.id === source.id)?.duration ||
          source.duration_seconds ||
          null,
      };
    });
    const selectedMedia = timelineScenes
      .map((scene, index) => {
        const item = selectedMediaByScene[scene.id];
        if (!item) return null;
        return {
          scene_id: scene.id,
          index,
          original_index: scene.originalIndex ?? index,
          kind: item.kind,
          provider: item.provider,
          title: item.title,
          thumb: item.thumb,
          preview_url: item.previewUrl,
          download_url: item.downloadUrl,
          duration: Number(scene.duration.toFixed(2)),
          width: item.width,
          height: item.height,
        };
      })
      .filter(Boolean);

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
        frame_style: frameStyle || null,
        overlay_text: overlayText.trim() || null,
        caption_text: captionText.trim() || null,
        captions_visible: captionsVisible,
        caption_scale: captionScale,
        selected_element: selectedElement
          ? {
              ...selectedElement,
              color: elementColor,
              background: elementBackground,
              size: elementSize,
            }
          : null,
        voice_id: voiceId.trim() || null,
        voice_text:
          captionText.trim() ||
          overlayText.trim() ||
          job.script_text ||
          job.title ||
          null,
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
        aspect_ratio: aspectRatio,
        source_scene_count: baseSceneIds.length,
        excluded_source_ids: Array.from(excludedSources),
        source_clips: sourceClips,
        selected_media: selectedMedia,
        scene_motions: timelineScenes.map((scene, index) => ({
          id: scene.id,
          index,
          original_index: scene.originalIndex ?? index,
          motion: sceneMotions[scene.id] || motion,
        })),
        scene_durations: timelineScenes.map((scene, index) => ({
          id: scene.id,
          index,
          original_index: scene.originalIndex ?? index,
          label: scene.label,
          duration: Number(scene.duration.toFixed(2)),
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setExporting(false);
    if (!res.ok) {
      toast(data.error || "Export failed", "error");
      return;
    }
    toast(t("exportStarted"), "info");
    router.push(backHref);
  }

  function renderPanel() {
    if (tool === "visuals") {
      return (
        <div>
          <StickyPanelTop compact>
            <PanelHeading title="Library">
              Search videos and photos from the connected media sources. Select
              an asset to replace the current scene preview.
            </PanelHeading>
            <SearchBox
              value={visualQuery}
              onChange={setVisualQuery}
              placeholder="Search videos and photos"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "video", label: "Video" },
                  { id: "photo", label: "Photo" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setVisualFilter(chip.id)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-600"
                  style={{
                    borderColor:
                      visualFilter === chip.id ? "rgba(138,0,212,0.35)" : LINE,
                    background:
                      visualFilter === chip.id ? "rgba(138,0,212,0.07)" : "#fff",
                    color: visualFilter === chip.id ? ACCENT : "#4b5563",
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {visualSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {visualSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVisualQuery(item)}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </StickyPanelTop>

          <SectionLabel title="Videos and photos" />
          {visualError && (
            <p className="mb-2 text-xs font-medium text-amber-700">
              {visualError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {visualItems.map((asset) => {
              const active =
                selectedScene &&
                selectedMediaByScene[selectedScene.id]?.key === asset.key;
              const replacing = applyingMediaKey === `replace:${asset.key}`;
              const adding = applyingMediaKey === `add:${asset.key}`;
              return (
                <div
                  key={asset.key}
                  className="group overflow-hidden rounded-lg border bg-white text-left transition"
                  style={{
                    borderColor: active ? "rgba(138,0,212,0.55)" : LINE,
                    boxShadow: active
                      ? "0 0 0 2px rgba(138,0,212,0.10)"
                      : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void applyVisualAsset(asset, "replace")}
                    className="relative block aspect-video w-full overflow-hidden bg-gray-900 text-left"
                    title={asset.title}
                  >
                    {asset.kind === "video" && asset.previewUrl ? (
                      <video
                        src={asset.previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                      />
                    ) : asset.thumb || asset.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.thumb || asset.previewUrl || ""}
                        alt=""
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      {asset.kind}
                    </span>
                    {asset.durationSec != null && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {formatTime(asset.durationSec)}
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black/88 via-black/55 to-transparent px-2 pb-9 pt-8 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                      <span className="block truncate text-xs font-semibold text-white">
                        {asset.title}
                      </span>
                      <span className="block truncate text-[10px] font-semibold text-white/70">
                        {asset.provider}
                      </span>
                    </span>
                    {(replacing || adding) && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                        Loading...
                      </span>
                    )}
                    {active && !replacing && !adding && (
                      <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded bg-white text-[color:#8a00d4]">
                        <MiniIcon name="check" />
                      </span>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-1 border-t p-1" style={{ borderColor: LINE }}>
                    <button
                      type="button"
                      onClick={() => void applyVisualAsset(asset, "add")}
                      disabled={Boolean(applyingMediaKey)}
                      className="flex h-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                      title="Add as new scene"
                      aria-label="Add as new scene"
                    >
                      <MiniIcon name="plus" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyVisualAsset(asset, "replace")}
                      disabled={Boolean(applyingMediaKey)}
                      className="flex h-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                      title="Replace selected scene"
                      aria-label="Replace selected scene"
                    >
                      <MiniIcon name="replace" />
                    </button>
                  </div>
                </div>
              );
            })}
            {visualLoading && visualItems.length === 0 && (
              <p className="col-span-2 text-sm text-gray-500">
                {tCommon("loading")}
              </p>
            )}
            {!visualLoading && visualItems.length === 0 && (
              <p className="col-span-2 text-sm text-gray-500">
                No videos or photos found yet.
              </p>
            )}
          </div>
          <div ref={visualSentinelRef} className="h-8" />
          {visualLoadingMore && (
            <p className="pb-4 text-center text-xs font-semibold text-gray-400">
              Loading more...
            </p>
          )}
        </div>
      );
    }

    if (tool === "audio") {
      return (
        <div>
          <StickyPanelTop>
            <PanelHeading title="Audio">
              Music is loaded from your project music library.
            </PanelHeading>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "none" as const, label: "Off" },
                  { id: "auto" as const, label: tc("auto") },
                  { id: "track" as const, label: "Pick" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setMusicMode(mode.id)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    borderColor: musicMode === mode.id ? "rgba(138,0,212,0.45)" : LINE,
                    color: musicMode === mode.id ? ACCENT : "#374151",
                    background: musicMode === mode.id ? "rgba(138,0,212,0.07)" : "#fff",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setMusicQuery(musicDraftQuery.trim());
              }}
            >
              <input
                value={musicDraftQuery}
                onChange={(e) => setMusicDraftQuery(e.target.value)}
                placeholder={t("searchMusic")}
                className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm outline-none"
                style={{ borderColor: LINE }}
              />
              <button
                type="submit"
                className="rounded-lg px-3 text-sm font-semibold text-white"
                style={{ background: ACCENT }}
              >
                {tCommon("search")}
              </button>
            </form>
            <label className="mt-4 block space-y-2 text-xs font-semibold text-gray-600">
              Music volume {Math.round(musicVolume * 100)}%
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={musicVolume}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMusicVolume(next);
                  if (musicRef.current) musicRef.current.volume = next;
                }}
                className="w-full accent-[#8a00d4]"
              />
            </label>
            <SectionLabel title="Original audio" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKeepOriginal(true)}
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                style={{
                  borderColor: keepOriginal ? "rgba(138,0,212,0.45)" : LINE,
                  color: keepOriginal ? ACCENT : "#374151",
                }}
              >
                {t("keepVo")}
              </button>
              <button
                type="button"
                onClick={() => setKeepOriginal(false)}
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                style={{
                  borderColor: !keepOriginal ? "rgba(138,0,212,0.45)" : LINE,
                  color: !keepOriginal ? ACCENT : "#374151",
                }}
              >
                {t("muteVo")}
              </button>
            </div>
            {keepOriginal && (
              <label className="mt-4 block space-y-2 text-xs font-semibold text-gray-600">
                {t("voice")} {voiceVolume.toFixed(2)}
                <input
                  type="range"
                  min={0.2}
                  max={1.4}
                  step={0.01}
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full accent-[#8a00d4]"
                />
              </label>
            )}
          </StickyPanelTop>

          <SectionLabel title="Music library" />
          <div className="space-y-2 pr-1">
            {musicLoading ? (
              <p className="text-sm text-gray-500">{tCommon("loading")}</p>
            ) : tracks.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noTracks")}</p>
            ) : (
              tracks.map((track) => {
                const selected = musicTrackId === track.id;
                const playingTrack = playingMusicId === track.id;
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 rounded-lg border bg-white p-2"
                    style={{
                      borderColor: selected ? "rgba(138,0,212,0.45)" : LINE,
                    }}
                  >
                    <ButtonIcon
                      label={playingTrack ? "Stop preview" : "Play preview"}
                      onClick={() => toggleMusicPreview(track)}
                      disabled={!track.previewUrl}
                    >
                      <MiniIcon name={playingTrack ? "pause" : "play"} />
                    </ButtonIcon>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setMusicTrackId(track.id);
                        setMusicMode("track");
                      }}
                    >
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {track.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {[
                          track.author,
                          track.mood,
                          track.durationSec != null
                            ? formatTime(track.durationSec)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" - ")}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    if (tool === "voice") {
      const filters: { id: GenderFilter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "male", label: "Male" },
        { id: "female", label: "Female" },
        { id: "neutral", label: "Neutral" },
      ];
      const selectedVoice = voices.find((voice) => voice.id === voiceId) || null;
      return (
        <div>
          <StickyPanelTop>
            <PanelHeading title="Voice">
              ElevenLabs voices are loaded from your connected voice library.
            </PanelHeading>
            <SearchBox
              value={voiceDraftQuery}
              onChange={setVoiceDraftQuery}
              placeholder="Search ElevenLabs voices"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.map((filter) => {
                const active = voiceGender === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setVoiceGender(filter.id)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{
                      borderColor: active ? "rgba(138,0,212,0.35)" : LINE,
                      background: active ? "rgba(138,0,212,0.07)" : "#fff",
                      color: active ? ACCENT : "#4b5563",
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border bg-gray-50 p-3" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {selectedVoice?.name || (voiceId ? voiceId : "Original audio")}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {selectedVoice ? voiceMeta(selectedVoice) : "No AI voice selected"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceId("");
                    setKeepOriginal(true);
                  }}
                  className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-gray-600"
                  style={{ borderColor: LINE }}
                >
                  Original
                </button>
              </div>
              <label className="mt-3 block space-y-2 text-xs font-semibold text-gray-600">
                Voice volume {Math.round(voiceVolume * 100)}%
                <input
                  type="range"
                  min={0.2}
                  max={1.4}
                  step={0.01}
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full accent-[#8a00d4]"
                />
              </label>
            </div>
          </StickyPanelTop>

          <SectionLabel title="ElevenLabs voices" />
          {voicesError && (
            <p className="mb-2 text-xs font-medium text-amber-700">
              {voicesError}
            </p>
          )}
          <div className="space-y-2">
            {voices.map((voice) => {
              const selected = voiceId === voice.id;
              const playing = playingVoiceId === voice.id;
              const loading = loadingVoiceId === voice.id;
              return (
                <div
                  key={`${voice.source || "voice"}-${voice.id}`}
                  className="flex items-center gap-2 rounded-lg border bg-white p-2"
                  style={{
                    borderColor: selected ? "rgba(138,0,212,0.45)" : LINE,
                  }}
                >
                  <ButtonIcon
                    label={playing ? "Stop preview" : "Play voice preview"}
                    onClick={() => void toggleVoicePreview(voice)}
                    disabled={loading}
                    active={playing}
                  >
                    {loading ? "..." : <MiniIcon name={playing ? "pause" : "play"} />}
                  </ButtonIcon>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => chooseVoice(voice)}
                  >
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {voice.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {voiceMeta(voice)}
                    </span>
                  </button>
                  {selected && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(138,0,212,0.08)] text-[color:#8a00d4]">
                      <MiniIcon name="check" />
                    </span>
                  )}
                </div>
              );
            })}
            {voicesLoading && voices.length === 0 && (
              <p className="text-sm text-gray-500">{tCommon("loading")}</p>
            )}
            {!voicesLoading && voices.length === 0 && !voicesError && (
              <p className="text-sm text-gray-500">No voices found yet.</p>
            )}
          </div>
          <div ref={voicesSentinelRef} className="h-8" />
          {voicesLoadingMore && (
            <p className="pb-4 text-center text-xs font-semibold text-gray-400">
              Loading more...
            </p>
          )}
        </div>
      );
    }

    if (tool === "layouts") {
      return (
        <div>
          <PanelHeading title="Layouts">
            Fit the video to the working canvas and set transform behavior.
          </PanelHeading>
          <SectionLabel title="Aspect" />
          <div className="grid grid-cols-3 gap-2">
            {["9:16", "16:9", "1:1"].map((aspect) => (
              <button
                key={aspect}
                type="button"
                onClick={() => setAspectRatio(aspect)}
                className="rounded-lg border px-3 py-3 text-sm font-semibold"
                style={{
                  borderColor: aspectRatio === aspect ? "rgba(138,0,212,0.45)" : LINE,
                  background: aspectRatio === aspect ? "rgba(138,0,212,0.07)" : "#fff",
                  color: aspectRatio === aspect ? ACCENT : "#374151",
                }}
              >
                {aspect}
              </button>
            ))}
          </div>

          <SectionLabel title="Speed" />
          <div className="grid grid-cols-3 gap-2">
            {SPEEDS.map((speed) => (
              <button
                key={speed.id}
                type="button"
                onClick={() => {
                  setPlaybackSpeed(speed.value);
                  setActivePack(null);
                }}
                className="rounded-lg border px-3 py-2 text-sm font-semibold"
                style={{
                  borderColor:
                    Math.abs(playbackSpeed - speed.value) < 0.01
                      ? "rgba(138,0,212,0.45)"
                      : LINE,
                  color:
                    Math.abs(playbackSpeed - speed.value) < 0.01
                      ? ACCENT
                      : "#374151",
                }}
              >
                {speed.label}
              </button>
            ))}
          </div>

          <SectionLabel title="Transform" />
          <label className="block space-y-2 text-xs font-semibold text-gray-600">
            Zoom {Math.round(zoom * 100)}%
            <input
              type="range"
              min={1}
              max={1.8}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#8a00d4]"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFlipH((value) => !value)}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: flipH ? "rgba(138,0,212,0.45)" : LINE }}
            >
              {t("flipH")}
            </button>
            <button
              type="button"
              onClick={() => setFlipV((value) => !value)}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: flipV ? "rgba(138,0,212,0.45)" : LINE }}
            >
              {t("flipV")}
            </button>
          </div>
        </div>
      );
    }

    if (tool === "text") {
      return (
        <div>
          <StickyPanelTop compact>
            <PanelHeading title="Text">
              Add a hook, chapter label, CTA, or title overlay to the video.
            </PanelHeading>
            <textarea
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value.slice(0, 120))}
              placeholder={t("titleHook")}
              className="min-h-[96px] w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none"
              style={{ borderColor: LINE }}
            />
            <div className="mt-3">
              <SearchBox
                value={panelQuery}
                onChange={setPanelQuery}
                placeholder="Search text styles"
              />
            </div>
          </StickyPanelTop>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {filteredTextStyles.map((style) => (
              <StyleTile
                key={style.id}
                label={style.label}
                active={textStyle === style.id}
                onClick={() => setTextStyle(style.id)}
              >
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={{ background: previewGradient(style.id, true) }}
                >
                  <span
                    className={overlayTextClass(style.id)}
                    style={{
                      ...overlayTextStyle(style.id),
                      fontSize: 12,
                      padding:
                        String(style.id).includes("box") ||
                        String(style.id).includes("banner")
                          ? "3px 5px"
                          : undefined,
                      maxWidth: "calc(100% - 10px)",
                    }}
                  >
                    Style
                  </span>
                </div>
              </StyleTile>
            ))}
          </div>
        </div>
      );
    }

    if (tool === "elements") {
      return (
        <div>
          <StickyPanelTop compact>
            <PanelHeading title="Elements">
              OpenMoji emojis and Iconify icons load continuously as you scroll.
            </PanelHeading>
            <SearchBox
              value={elementQuery}
              onChange={setElementQuery}
              placeholder="Search icons and emoji"
            />
            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>{elementsLoading ? "Loading library" : "Emoji and icons"}</span>
              {elementsError && <span className="text-amber-700">{elementsError}</span>}
            </div>
          </StickyPanelTop>
          {selectedElement && (
            <div className="mt-4 rounded-lg border bg-white p-3" style={{ borderColor: LINE }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {selectedElement.label}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {selectedElement.provider || selectedElement.kind}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedElement(null)}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-red-600"
                  style={{ borderColor: "rgba(220,38,38,0.28)" }}
                >
                  Delete
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">
                  Color
                  <input
                    type="color"
                    value={elementColor}
                    onChange={(event) => setElementColor(event.target.value)}
                    className="mt-1 h-9 w-full rounded border bg-white p-1"
                    style={{ borderColor: LINE }}
                  />
                </label>
                <label className="text-xs font-semibold text-gray-600">
                  Background
                  <input
                    type="color"
                    value={elementBackground}
                    onChange={(event) => setElementBackground(event.target.value)}
                    className="mt-1 h-9 w-full rounded border bg-white p-1"
                    style={{ borderColor: LINE }}
                  />
                </label>
              </div>
              <label className="mt-3 block space-y-2 text-xs font-semibold text-gray-600">
                Size {Math.round(elementSize * 100)}%
                <input
                  type="range"
                  min={0.55}
                  max={1.9}
                  step={0.05}
                  value={elementSize}
                  onChange={(event) => setElementSize(Number(event.target.value))}
                  className="w-full accent-[#8a00d4]"
                />
              </label>
            </div>
          )}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {filteredElements.map((item) => {
              const active =
                selectedElement?.kind === item.kind &&
                selectedElement?.label === item.label &&
                selectedElement?.assetUrl === item.assetUrl;
              const loading = applyingElementKey === elementKey(item);
              return (
                <button
                  key={`${item.kind}-${item.sourceId || item.label}-${item.assetUrl || item.symbol}`}
                  type="button"
                  onClick={() => void applyElement(item)}
                  className="relative flex aspect-square flex-col items-center justify-center rounded-lg border bg-white text-center transition"
                  style={{
                    borderColor: active ? "rgba(138,0,212,0.5)" : LINE,
                    color: active ? ACCENT : "#111827",
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center text-xl font-black">
                    {item.assetUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.assetUrl}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      item.symbol
                    )}
                  </span>
                  <span className="mt-1 max-w-full truncate px-1 text-[10px] font-semibold text-gray-500">
                    {item.label}
                  </span>
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/82 text-[11px] font-semibold text-gray-700">
                      Loading...
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div ref={elementsSentinelRef} className="h-8" />
          {elementsLoadingMore && (
            <p className="pb-4 text-center text-xs font-semibold text-gray-400">
              Loading more...
            </p>
          )}
        </div>
      );
    }

    if (tool === "style") {
      const categories: { id: StyleCategory; label: string }[] = [
        { id: "looks", label: "Looks" },
        { id: "effects", label: "Effects" },
        { id: "motion", label: "Motion" },
        { id: "transitions", label: "Transitions" },
        { id: "fades", label: "Fades" },
        { id: "color", label: "Color" },
      ];
      return (
        <div>
          <StickyPanelTop compact>
            <PanelHeading title="Filter">
              Apply professional filters, motion, color and transitions.
            </PanelHeading>
            <SearchBox
              value={styleQuery}
              onChange={setStyleQuery}
              placeholder="Search styles, effects, motion"
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {categories.map((category) => {
                const active = styleCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setStyleCategory(category.id)}
                    className="rounded-lg border px-2 py-2 text-xs font-semibold"
                    style={{
                      borderColor: active ? "rgba(138,0,212,0.4)" : LINE,
                      background: active ? "rgba(138,0,212,0.07)" : "#fff",
                      color: active ? ACCENT : "#4b5563",
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </StickyPanelTop>

          {styleCategory === "looks" && (
            <>
              <SectionLabel title="Look packs" />
              <div className="grid grid-cols-2 gap-3">
                {LOOK_PACKS.map((pack) => (
                  <StyleTile
                    key={pack.id}
                    label={pack.label}
                    active={activePack === pack.id}
                    onClick={() => applyLookPack(pack)}
                  >
                    <div className="relative h-full w-full" style={lookPackPreviewStyle(pack)}>
                      <span
                        className="absolute inset-x-2 bottom-1 rounded bg-black/55 px-1.5 py-0.5 text-center text-[10px] font-black text-white"
                        style={captionPreviewStyle(pack.subtitle)}
                      >
                        {pack.label}
                      </span>
                    </div>
                  </StyleTile>
                ))}
              </div>
            </>
          )}

          {styleCategory === "effects" && (
            <>
              <SectionLabel title="Color effects" />
              <div className="grid grid-cols-2 gap-3">
                {filteredEffects.slice(0, 30).map((item) => (
                  <StyleTile
                    key={item.id}
                    label={item.label}
                    active={effect === item.id}
                    onClick={() => {
                      setEffect(item.id);
                      setActivePack(null);
                    }}
                  >
                    <div className="h-full w-full" style={effectPreviewStyle(item)} />
                  </StyleTile>
                ))}
              </div>
            </>
          )}

          {styleCategory === "motion" && (
            <>
              <SectionLabel title="Motion" />
              <div className="grid grid-cols-2 gap-2">
                {filteredMotions.slice(0, 20).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMotion(item.id);
                      if (selectedSceneId) {
                        setSceneMotions((prev) => ({
                          ...prev,
                          [selectedSceneId]: item.id,
                        }));
                      }
                    }}
                    className="rounded-lg border px-3 py-2 text-left text-xs font-semibold"
                    style={{
                      borderColor:
                        motion === item.id ? "rgba(138,0,212,0.45)" : LINE,
                      color: motion === item.id ? ACCENT : "#374151",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {styleCategory === "transitions" && (
            <>
              <SectionLabel title="Transitions" />
              <div className="grid grid-cols-2 gap-2">
                {filteredTransitions.slice(0, 20).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTransition(item.id)}
                    className="rounded-lg border px-3 py-2 text-left text-xs font-semibold"
                    style={{
                      borderColor:
                        transition === item.id ? "rgba(138,0,212,0.45)" : LINE,
                      color: transition === item.id ? ACCENT : "#374151",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {styleCategory === "fades" && (
            <>
              <SectionLabel title="Fades" />
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">
                  <span className="mb-1 block">Intro</span>
                  <select
                    value={introFade}
                    onChange={(e) => setIntroFade(e.target.value as typeof introFade)}
                    className="h-10 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    style={{ borderColor: LINE }}
                  >
                    {FADES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-600">
                  <span className="mb-1 block">Outro</span>
                  <select
                    value={outroFade}
                    onChange={(e) => setOutroFade(e.target.value as typeof outroFade)}
                    className="h-10 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    style={{ borderColor: LINE }}
                  >
                    {FADES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {styleCategory === "color" && (
            <>
              <SectionLabel title="Color adjust" />
              <div className="space-y-3">
                {(
                  [
                    {
                      label: t("brightness"),
                      value: brightness,
                      min: -0.35,
                      max: 0.35,
                      step: 0.01,
                      onChange: setBrightness,
                      display: `${brightness >= 0 ? "+" : ""}${brightness.toFixed(2)}`,
                    },
                    {
                      label: t("contrast"),
                      value: contrast,
                      min: 0.6,
                      max: 1.6,
                      step: 0.01,
                      onChange: setContrast,
                      display: contrast.toFixed(2),
                    },
                    {
                      label: t("saturation"),
                      value: saturation,
                      min: 0,
                      max: 1.8,
                      step: 0.01,
                      onChange: setSaturation,
                      display: saturation.toFixed(2),
                    },
                  ] as const
                ).map((row) => (
                  <label
                    key={row.label}
                    className="block space-y-1 text-xs font-semibold text-gray-600"
                  >
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
                      className="w-full accent-[#8a00d4]"
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    if (tool === "frames") {
      return (
        <div>
          <StickyPanelTop compact>
            <PanelHeading title={t("framesTitle")}>
              {t("framesHint")}
            </PanelHeading>
            <div className="mb-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2" style={{ borderColor: LINE }}>
              <span className="text-sm font-semibold text-gray-700">
                {frameStyle
                  ? VIDEO_FRAMES.find((f) => f.id === frameStyle)?.label ||
                    frameStyle
                  : t("framesNone")}
              </span>
              <button
                type="button"
                onClick={() => setFrameStyle("")}
                disabled={!frameStyle}
                className="rounded-full px-3 py-1 text-xs font-semibold text-white transition disabled:opacity-40"
                style={{ background: frameStyle ? ACCENT : "#9ca3af" }}
              >
                {t("framesRemove")}
              </button>
            </div>
            <SearchBox
              value={panelQuery}
              onChange={setPanelQuery}
              placeholder={t("framesSearch")}
            />
          </StickyPanelTop>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StyleTile
              label={t("framesNone")}
              active={!frameStyle}
              onClick={() => setFrameStyle("")}
            >
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#1f2937,#4b5563)] text-[10px] font-semibold text-white/70">
                {t("framesNone")}
              </div>
            </StyleTile>
            {filteredFrames.map((frame) => (
              <StyleTile
                key={frame.id}
                label={frame.label}
                active={frameStyle === frame.id}
                onClick={() => setFrameStyle(frame.id)}
              >
                <div className="relative h-full w-full bg-[linear-gradient(135deg,#111827,#8a00d4_54%,#e8a54b)]">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ ...frameToCss(frame, 48), boxSizing: "border-box" }}
                  />
                </div>
              </StyleTile>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <StickyPanelTop compact>
          <PanelHeading title="Subtitles">
            Live subtitles update on the preview as soon as text or style changes.
          </PanelHeading>
          <div className="mb-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2" style={{ borderColor: LINE }}>
            <span className="text-sm font-semibold text-gray-700">Live preview</span>
            <button
              type="button"
              onClick={() => setCaptionsVisible((value) => !value)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ background: captionsVisible ? ACCENT : "#9ca3af" }}
            >
              {captionsVisible ? "On" : "Off"}
            </button>
          </div>
          <textarea
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value.slice(0, 120))}
            placeholder={t("captionPlaceholder")}
            className="min-h-[88px] w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none"
            style={{ borderColor: LINE }}
          />
          <label className="mt-3 block space-y-2 text-xs font-semibold text-gray-600">
            Subtitle size {Math.round(captionScale * 100)}%
            <input
              type="range"
              min={0.75}
              max={1.45}
              step={0.05}
              value={captionScale}
              onChange={(e) => setCaptionScale(Number(e.target.value))}
              className="w-full accent-[#8a00d4]"
            />
          </label>
          <div className="mt-3">
            <SearchBox
              value={panelQuery}
              onChange={setPanelQuery}
              placeholder="Search subtitle styles"
            />
          </div>
        </StickyPanelTop>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {filteredSubtitleStyles.map((style) => (
            <StyleTile
              key={style.id}
              label={style.label}
              active={subtitleStyle === style.id}
              onClick={() => setSubtitleStyle(style.id)}
            >
              <div className="flex h-full items-end justify-center bg-gray-950 p-2">
                <span style={captionPreviewStyle(style.id)}>Caption</span>
              </div>
            </StyleTile>
          ))}
        </div>
      </div>
    );
  }

  const previewFrameStyle = {
    aspectRatio:
      aspectRatio === "16:9"
        ? "16 / 9"
        : aspectRatio === "1:1"
          ? "1 / 1"
          : "9 / 16",
    borderRadius: 4,
    height:
      aspectRatio === "16:9"
        ? "clamp(220px, calc(100vh - 450px), 480px)"
        : aspectRatio === "1:1"
          ? "clamp(220px, calc(100vh - 450px), 520px)"
          : "clamp(240px, calc(100vh - 450px), 620px)",
    maxWidth: "100%",
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#f6f7fb] text-gray-950">
      {notice}

      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b bg-white px-4" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white" style={{ borderColor: LINE }}>
            <BrandMark size={28} />
          </div>
          <Link
            href={backHref}
            className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            style={{ borderColor: LINE }}
          >
            Back
          </Link>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
            style={{ borderColor: LINE }}
            aria-label="Aspect ratio"
          >
            <option value="9:16">Portrait 9:16</option>
            <option value="16:9">Landscape 16:9</option>
            <option value="1:1">Square 1:1</option>
          </select>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-gray-900">
            {job.title || t("title")}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {selectedScene ? selectedScene.label : "Scene"} - {formatTime(current)} / {formatTime(duration)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-gray-500 md:inline">
            All changes saved locally
          </span>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void onExport()}
            className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            <MiniIcon name="export" />
            {exporting ? "Exporting..." : "Export video"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          className="flex w-[98px] shrink-0 flex-col items-stretch border-r bg-white py-4"
          style={{ borderColor: LINE }}
          aria-label={t("editorTools")}
        >
          {TOOLS.map((item) => {
            const active = tool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTool(item.id);
                  if (item.id !== "elements") setElementQuery("");
                  if (item.id !== "style") setStyleQuery("");
                  if (!["visuals", "text", "subtitles", "frames"].includes(item.id))
                    setPanelQuery("");
                }}
                className="mx-2 mb-1 flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-lg px-1 text-[11px] font-semibold leading-tight transition"
                style={{
                  color: active ? ACCENT : "#4b5563",
                  background: active ? "rgba(138,0,212,0.08)" : "transparent",
                  boxShadow: active ? `inset 3px 0 0 ${ACCENT}` : undefined,
                }}
              >
                <ToolIcon id={item.id} />
                <span className="max-w-[76px] text-center">
                  {item.id === "frames" ? t("framesTab") : item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <aside
          ref={panelRef}
          className="hidden w-[440px] shrink-0 overflow-y-auto border-r bg-white px-5 py-5 md:block"
          style={{ borderColor: LINE }}
        >
          {renderPanel()}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <section className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between border-b bg-white/72 px-6" style={{ borderColor: LINE }}>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  Scene duration: {selectedScene ? formatSeconds(selectedScene.duration) : formatSeconds(trimEnd - trimStart)}
                </span>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: LINE }}
                  onClick={() => setLoopPreview((value) => !value)}
                >
                  Loop {loopPreview ? "on" : "off"}
                </button>
              </div>
              <div className="text-sm font-semibold text-gray-600">
                Video duration: {formatTime(totalSceneDuration || duration)}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#f0f1f4] px-6 py-5">
              <div className="flex w-full flex-col items-center">
                <div
                  className="relative inline-flex shrink-0 overflow-hidden bg-black shadow-[0_24px_90px_rgba(17,24,39,0.22)]"
                  style={previewFrameStyle}
                >
                  <video
                    ref={videoRef}
                    src={previewSrc}
                    className="h-full w-full object-cover transition-transform duration-300"
                    style={{
                      filter: previewFilter,
                      transform: previewTransform,
                    }}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={onLoadedMeta}
                    onClick={togglePlay}
                  />

                  {selectedSceneMedia && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-black transition-transform duration-300"
                      style={{
                        filter: previewFilter,
                        transform: previewTransform,
                      }}
                    >
                      {selectedSceneMedia.kind === "video" &&
                      selectedSceneMedia.previewUrl ? (
                        <video
                          src={selectedSceneMedia.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          loop
                          autoPlay={playing}
                          playsInline
                          preload="metadata"
                        />
                      ) : selectedSceneMedia.previewUrl || selectedSceneMedia.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            selectedSceneMedia.previewUrl ||
                            selectedSceneMedia.thumb ||
                            ""
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase text-white">
                        {selectedSceneMedia.provider} {selectedSceneMedia.kind}
                      </span>
                    </div>
                  )}

                  {effect === "vignette" && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ boxShadow: "inset 0 0 80px 24px rgba(0,0,0,0.55)" }}
                    />
                  )}

                  {frameStyle && (
                    <div
                      className="pointer-events-none absolute inset-0 z-10"
                      style={{ ...frameToCss(frameStyle, 360), boxSizing: "border-box" }}
                    />
                  )}

                  {overlayText.trim() && (
                    <div className={`pointer-events-none ${overlayTextClass(textStyle)}`}>
                      <span style={overlayTextStyle(textStyle)}>
                        {overlayText.trim().slice(0, 80)}
                      </span>
                    </div>
                  )}

                  {selectedElement && (
                    <div className="pointer-events-none absolute right-[10%] top-[16%]">
                      <span
                        className="flex items-center justify-center rounded-full px-3 font-black shadow-lg"
                        style={{
                          minWidth: 56 * elementSize,
                          height: 56 * elementSize,
                          background: elementBackground,
                          color: elementColor,
                          fontSize: 30 * elementSize,
                        }}
                      >
                        {selectedElement.assetUrl && selectedElement.kind === "icon" ? (
                          <span
                            className="block"
                            style={{
                              width: 38 * elementSize,
                              height: 38 * elementSize,
                              backgroundColor: elementColor,
                              WebkitMask: `url(${selectedElement.assetUrl}) center / contain no-repeat`,
                              mask: `url(${selectedElement.assetUrl}) center / contain no-repeat`,
                            }}
                          />
                        ) : selectedElement.assetUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedElement.assetUrl}
                            alt=""
                            style={{
                              width: 40 * elementSize,
                              height: 40 * elementSize,
                            }}
                            className="object-contain"
                          />
                        ) : (
                          selectedElement.symbol
                        )}
                      </span>
                    </div>
                  )}

                  {captionsVisible && liveCaptionText && (
                    <div className="pointer-events-none absolute inset-x-4 bottom-[8%] text-center">
                      <span
                        style={{
                          ...captionPreviewStyle(subtitleStyle),
                          transform: `scale(${captionScale})`,
                          transformOrigin: "center bottom",
                          display: "inline-block",
                        }}
                      >
                        {liveCaptionText.slice(0, 80)}
                      </span>
                    </div>
                  )}

                  {(applyingMediaKey || applyingElementKey || loadingVoiceId) && (
                    <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center">
                      <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                        Loading change...
                      </span>
                    </div>
                  )}

                  {!playing && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/18 transition hover:bg-black/28"
                      aria-label={tc("play")}
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/92 text-gray-950 shadow-xl">
                        <MiniIcon name="play" />
                      </span>
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm" style={{ borderColor: LINE }}>
                  <ButtonIcon label={playing ? "Pause" : "Play"} onClick={togglePlay}>
                    <MiniIcon name={playing ? "pause" : "play"} />
                  </ButtonIcon>
                  <select
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold outline-none"
                    style={{ borderColor: LINE }}
                    value={String(Math.round(zoom * 100))}
                    onChange={(e) => setZoom(Number(e.target.value) / 100)}
                    aria-label="Preview zoom"
                  >
                    <option value="100">100%</option>
                    <option value="125">125%</option>
                    <option value="150">150%</option>
                    <option value="175">175%</option>
                  </select>
                  <ButtonIcon
                    label="Flip horizontal"
                    active={flipH}
                    onClick={() => setFlipH((value) => !value)}
                  >
                    H
                  </ButtonIcon>
                  <ButtonIcon
                    label="Flip vertical"
                    active={flipV}
                    onClick={() => setFlipV((value) => !value)}
                  >
                    V
                  </ButtonIcon>
                  <ButtonIcon
                    label="Reset color"
                    onClick={() => {
                      setBrightness(0);
                      setContrast(1);
                      setSaturation(1);
                      setZoom(1);
                    }}
                  >
                    R
                  </ButtonIcon>
                </div>
              </div>
            </div>
          </section>

          <section className="h-[258px] shrink-0 border-t bg-white" style={{ borderColor: LINE }}>
            <div className="flex h-14 items-center justify-between border-b px-6" style={{ borderColor: LINE }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700"
                  style={{ borderColor: LINE }}
                >
                  Add scene
                </button>
                <select
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
                  style={{ borderColor: LINE }}
                  value={transition}
                  onChange={(e) => setTransition(e.target.value as typeof transition)}
                  aria-label="Scene transition"
                >
                  {TRANSITIONS.slice(0, 18).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                <span>
                  {formatTime(current)} / {formatTime(totalSceneDuration || duration)}
                </span>
                {thumbsBusy && <span>Building frames...</span>}
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto px-6 py-4">
              <div className="flex min-w-max items-start gap-3">
                {timelineScenes.map((scene, index) => {
                  const active = selectedScene?.id === scene.id;
                  const sceneWidth = Math.max(
                    72,
                    Math.min(560, scene.duration * 34),
                  );
                  const sceneStart = timelineScenes
                    .slice(0, index)
                    .reduce((sum, item) => sum + item.duration, 0);
                  const sceneEnd = sceneStart + scene.duration;
                  const sceneVideoSrc = `${previewSrc}#t=${Math.max(
                    0,
                    sceneStart + 0.1,
                  ).toFixed(2)}`;
                  const playheadInside =
                    totalSceneDuration > 0 &&
                    current / Math.max(0.01, duration) >= sceneStart / totalSceneDuration &&
                    current / Math.max(0.01, duration) <= sceneEnd / totalSceneDuration;
                  return (
                    <div key={scene.id} className="flex items-start gap-3">
                      <div style={{ width: sceneWidth }}>
                        <div
                          className="relative h-[86px] overflow-hidden rounded-lg border bg-gray-900 shadow-sm transition"
                          style={{
                            borderColor: active ? "rgba(138,0,212,0.7)" : LINE,
                            boxShadow: active
                              ? "0 0 0 2px rgba(138,0,212,0.14)"
                              : undefined,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => seekToScene(scene)}
                            className="absolute inset-0 text-left"
                          >
                            <SourceThumb
                              clip={scene.source}
                              fallback={scene.thumb}
                              videoSrc={sceneVideoSrc}
                              label={scene.label}
                            />
                            <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {scene.label}
                            </span>
                            <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {formatSeconds(scene.duration)}
                            </span>
                            {playheadInside && (
                              <span
                                className="absolute inset-y-0 w-0.5"
                                style={{ left: "52%", background: ACCENT }}
                              />
                            )}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginSceneResize(scene, "left", event)
                            }
                            className="absolute inset-y-0 left-0 z-10 w-3 cursor-ew-resize bg-white/70 opacity-70 transition hover:opacity-100"
                            aria-label="Drag left edge to resize scene"
                            title="Drag to resize"
                          />
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginSceneResize(scene, "right", event)
                            }
                            className="absolute inset-y-0 right-0 z-10 w-3 cursor-ew-resize bg-white/70 opacity-70 transition hover:opacity-100"
                            aria-label="Drag right edge to resize scene"
                            title="Drag to resize"
                          />
                        </div>
                        <p className="mt-1 truncate text-center text-xs font-semibold text-gray-700">
                          {scene.label}
                        </p>
                        <p className="mt-1 text-center text-sm font-semibold tabular-nums text-gray-800">
                          {formatSeconds(scene.duration)}
                        </p>
                        <select
                          value={sceneMotions[scene.id] || motion}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSceneMotions((prev) => ({
                              ...prev,
                              [scene.id]: next,
                            }));
                            if (selectedScene?.id === scene.id) {
                              setMotion(next as typeof motion);
                            }
                          }}
                          className="mt-2 h-7 w-full rounded border bg-white px-1.5 text-[11px] font-semibold text-gray-600 outline-none"
                          style={{ borderColor: LINE }}
                          aria-label="Scene motion"
                        >
                          {MOTIONS.slice(0, 14).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="mt-[34px] flex h-8 w-6 items-center justify-center rounded border bg-white text-xs font-bold text-gray-500"
                        style={{ borderColor: LINE }}
                        onClick={() => setTool("style")}
                        title="Transition"
                      >
                        |
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="flex h-[86px] w-[88px] items-center justify-center rounded-lg border border-dashed bg-gray-50 text-2xl font-light text-gray-400"
                  style={{ borderColor: "rgba(17,24,39,0.20)" }}
                  onClick={() => setTool("visuals")}
                  aria-label="Add scene from visuals"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t px-6 py-2" style={{ borderColor: LINE }}>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{ background: ACCENT }}
                onClick={togglePlay}
                aria-label={playing ? "Pause timeline" : "Play timeline"}
              >
                <MiniIcon name={playing ? "pause" : "play"} />
              </button>
              <div
                className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-gray-200"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  seekTo((event.clientX - rect.left) / rect.width);
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${duration > 0 ? Math.min(100, (current / duration) * 100) : 0}%`,
                    background: ACCENT,
                  }}
                />
              </div>
              <div className="hidden items-center gap-2 text-xs font-semibold text-gray-500 lg:flex">
                <span>Trim</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.05}
                  value={trimStart}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTrimStart(Math.min(next, trimEnd - 0.5));
                  }}
                  className="w-24 accent-[#8a00d4]"
                  aria-label={t("trimStart")}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.05}
                  value={trimEnd}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTrimEnd(Math.max(next, trimStart + 0.5));
                  }}
                  className="w-24 accent-[#8a00d4]"
                  aria-label={t("trimEnd")}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
