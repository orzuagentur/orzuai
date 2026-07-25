"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { SUBTITLE_STYLES } from "@/lib/editor-catalog";

export type SubtitleStyleId = (typeof SUBTITLE_STYLES)[number]["id"];

/** Full sentence for live karaoke-style preview on each subtitle card */
const PREVIEW_SENTENCE =
  "This is how your subtitles look on the clip";
const PREVIEW_WORDS = PREVIEW_SENTENCE.split(/\s+/);
/** Match burned ASS: ~3 words on screen, then advance to the next group */
const PREVIEW_CHUNK = 3;

/** One square stock photo per style (Unsplash — free to display) */
export const SUBTITLE_PREVIEW_BG: Record<SubtitleStyleId, string> = {
  classic:
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=480&h=480&q=80",
  karaoke_gold:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=480&h=480&q=80",
  box_white:
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=480&h=480&q=80",
  neon_pink:
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=480&h=480&q=80",
  minimal:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&h=480&q=80",
  impact:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=480&h=480&q=80",
  soft_shadow:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=480&h=480&q=80",
  yellow_pop:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=480&h=480&q=80",
  lower_third:
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=480&h=480&q=80",
  hook_banner:
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=480&h=480&q=80",
  cyan_glow:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=480&h=480&q=80",
  fire_orange:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&h=480&q=80",
  lime_pulse:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&h=480&q=80",
  comic_pop:
    "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=480&h=480&q=80",
  glass_frost:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=480&h=480&q=80",
  serif_clean:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&h=480&q=80",
  stack_outline:
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=480&h=480&q=80",
  typewriter:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=480&h=480&q=80",
  viral_white:
    "https://images.unsplash.com/photo-1516280440612-907644e9deba?auto=format&fit=crop&w=480&h=480&q=80",
  duotone_sub:
    "https://images.unsplash.com/photo-1550684848-89b6e8f564f8?auto=format&fit=crop&w=480&h=480&q=80",
  neon_cyan:
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=480&h=480&q=80",
  soft_white:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&h=480&q=80",
  mint_clean:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&h=480&q=80",
  purple_wave:
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=480&h=480&q=80",
  newspaper:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=480&h=480&q=80",
  street_graffiti:
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=480&h=480&q=80",
  elegant_gold:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=480&h=480&q=80",
  bold_white:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=480&h=480&q=80",
};

/** Map legacy training ids → current catalog */
export function normalizeSubtitleStyle(
  raw: string | null | undefined,
): SubtitleStyleId {
  const v = String(raw || "").trim();
  if (SUBTITLE_STYLES.some((s) => s.id === v)) {
    return v as SubtitleStyleId;
  }
  if (v === "karaoke_bold" || v === "karaoke") return "karaoke_gold";
  return "classic";
}

export function liveSubtitleStyle(style: SubtitleStyleId): CSSProperties {
  const base: CSSProperties = {
    fontWeight: 800,
    fontSize: "0.68rem",
    lineHeight: 1.35,
    textAlign: "center",
    maxWidth: "100%",
  };
  switch (style) {
    case "karaoke_gold":
      return {
        ...base,
        color: "#FFD700",
        textShadow: "0 0 10px rgba(255,215,0,0.55), 0 2px 4px #000",
      };
    case "box_white":
      return {
        ...base,
        color: "#fff",
        background: "rgba(0,0,0,0.62)",
        borderRadius: 6,
        padding: "4px 8px",
        display: "inline-block",
      };
    case "neon_pink":
      return {
        ...base,
        color: "#FF66FF",
        textShadow: "0 0 10px #FF00AA, 0 2px 4px #000",
      };
    case "minimal":
      return {
        ...base,
        color: "#f0f0f0",
        fontWeight: 500,
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
      };
    case "impact":
      return {
        ...base,
        fontSize: "0.72rem",
        color: "#fff",
        textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
      };
    case "soft_shadow":
      return {
        ...base,
        color: "#fff",
        textShadow: "0 3px 8px rgba(0,0,0,0.9)",
      };
    case "yellow_pop":
      return {
        ...base,
        color: "#FFFF00",
        textShadow: "0 2px 4px #000",
      };
    case "lower_third":
      return {
        ...base,
        color: "#fff",
        fontSize: "0.62rem",
        background: "rgba(0,0,0,0.75)",
        borderLeft: "3px solid var(--accent)",
        padding: "4px 8px",
        display: "inline-block",
        textAlign: "left",
      };
    case "hook_banner":
      return {
        ...base,
        color: "var(--accent)",
        fontSize: "0.72rem",
        textShadow: "0 2px 6px #000",
      };
    case "cyan_glow":
      return {
        ...base,
        color: "#66E0FF",
        textShadow: "0 0 12px #00AAFF, 0 2px 4px #000",
      };
    case "fire_orange":
      return {
        ...base,
        color: "#FFA500",
        textShadow: "0 0 10px #FF4500, 0 2px 4px #000",
      };
    case "lime_pulse":
      return {
        ...base,
        color: "#99FF00",
        textShadow: "0 2px 6px #000",
      };
    case "comic_pop":
      return {
        ...base,
        color: "#fff",
        textShadow: "3px 3px 0 #FF0000, -1px -1px 0 #000",
      };
    case "glass_frost":
      return {
        ...base,
        color: "#fff",
        background: "rgba(26,26,46,0.65)",
        borderRadius: 8,
        padding: "4px 10px",
        display: "inline-block",
      };
    case "serif_clean":
      return {
        ...base,
        color: "#f8f8f8",
        fontWeight: 500,
        fontFamily: "Georgia, serif",
        textShadow: "0 1px 4px #000",
      };
    case "stack_outline":
      return {
        ...base,
        color: "transparent",
        WebkitTextStroke: "1.5px #fff",
        textShadow: "none",
      };
    case "typewriter":
      return {
        ...base,
        color: "#e8e8e8",
        fontWeight: 500,
        fontFamily: "Courier New, monospace",
        letterSpacing: "0.04em",
      };
    case "viral_white":
      return {
        ...base,
        color: "#fff",
        fontSize: "0.78rem",
        textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 0 0 0 3px #000",
      };
    case "duotone_sub":
      return {
        ...base,
        color: "#FFCC66",
        textShadow: "0 0 8px #AA4400, 0 2px 4px #000",
      };
    case "neon_cyan":
      return {
        ...base,
        color: "#60E0FF",
        textShadow: "0 0 12px #FF0080, 0 2px 4px #000",
      };
    case "soft_white":
      return {
        ...base,
        color: "#fff",
        fontWeight: 500,
        background: "rgba(0,0,0,0.45)",
        borderRadius: 6,
        padding: "4px 8px",
        display: "inline-block",
      };
    case "mint_clean":
      return {
        ...base,
        color: "#C8FFD0",
        textShadow: "0 2px 4px #204030",
      };
    case "purple_wave":
      return {
        ...base,
        color: "#FFB0E0",
        textShadow: "0 0 10px #600080, 0 2px 4px #000",
      };
    case "newspaper":
      return {
        ...base,
        color: "#f5f5f5",
        fontWeight: 500,
        fontFamily: "Georgia, serif",
        background: "rgba(0,0,0,0.55)",
        padding: "4px 8px",
        display: "inline-block",
      };
    case "street_graffiti":
      return {
        ...base,
        color: "#80FF00",
        fontSize: "0.78rem",
        textShadow: "3px 3px 0 #000",
      };
    case "elegant_gold":
      return {
        ...base,
        color: "#FFD400",
        fontWeight: 500,
        fontFamily: "Georgia, serif",
        textShadow: "0 2px 6px #201000",
      };
    case "bold_white":
      return {
        ...base,
        color: "#fff",
        fontSize: "0.78rem",
        textShadow: "2px 2px 0 #000, -1px -1px 0 #000",
      };
    default:
      return {
        ...base,
        color: "#fff",
        textShadow: "0 2px 4px #000, 0 0 1px #000",
      };
  }
}

export function SubtitleStyleCard({
  style,
  active,
  disabled,
  onSelect,
}: {
  style: (typeof SUBTITLE_STYLES)[number];
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const cursorRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const advance = () => {
      if (cancelled) return;
      const c = cursorRef.current;
      const next = (c + 1) % PREVIEW_WORDS.length;
      const curChunk = Math.floor(c / PREVIEW_CHUNK);
      const nextChunk = Math.floor(next / PREVIEW_CHUNK);
      const wraps = nextChunk !== curChunk || next === 0;

      if (wraps) {
        setLeaving(true);
        later(() => {
          if (cancelled) return;
          cursorRef.current = next;
          setCursor(next);
          setLeaving(false);
          later(advance, 500);
        }, 170);
        return;
      }

      cursorRef.current = next;
      setCursor(next);
      later(advance, 500);
    };

    later(advance, 500);
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const css = liveSubtitleStyle(style.id);
  const bg = SUBTITLE_PREVIEW_BG[style.id];
  const chunkStart = Math.floor(cursor / PREVIEW_CHUNK) * PREVIEW_CHUNK;
  const chunk = PREVIEW_WORDS.slice(chunkStart, chunkStart + PREVIEW_CHUNK);
  const activeInChunk = cursor - chunkStart;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border text-left transition sm:rounded-xl disabled:opacity-55"
      style={{
        borderColor: active ? "rgba(232,165,75,0.55)" : "var(--line)",
        background: active ? "rgba(232,165,75,0.1)" : "rgba(0,0,0,0.25)",
        boxShadow: active ? "0 0 0 1px rgba(232,165,75,0.25)" : undefined,
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40 sm:aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex min-h-[40%] items-end justify-center px-1 pb-1.5 pt-3 sm:px-2.5 sm:pb-3 sm:pt-6">
          <span
            style={{
              ...css,
              fontSize: "0.52rem",
              display: "inline-block",
              opacity: leaving ? 0 : 1,
              transform: leaving ? "translateY(8px)" : "translateY(0)",
              transition: "opacity 0.16s ease, transform 0.16s ease",
            }}
          >
            {chunk.map((w, i) => {
              const isLive = i === activeInChunk && !leaving;
              const isPast = i < activeInChunk;
              return (
                <span
                  key={`${chunkStart}-${w}-${i}`}
                  style={{
                    opacity: isLive ? 1 : isPast ? 0.9 : 0.38,
                    transform: isLive
                      ? "translateY(-1px) scale(1.1)"
                      : "translateY(0) scale(1)",
                    display: "inline-block",
                    marginRight: i < chunk.length - 1 ? "0.3em" : 0,
                    transition:
                      "opacity 0.28s ease, transform 0.28s ease, filter 0.28s ease",
                    filter: isLive ? "brightness(1.2)" : "none",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </span>
        </div>
      </div>
      <span className="truncate px-1 py-1 text-center text-[9px] font-semibold sm:px-2 sm:py-1.5 sm:text-left sm:text-[11px]">
        {style.label}
      </span>
    </button>
  );
}

/**
 * Collapsible subtitle style list — live preview cards like AI Clipping.
 * Mobile: 3 columns; sm+: 4 columns.
 */
export function SubtitleStylePicker({
  value,
  onChange,
  disabled,
  className = "",
  defaultOpen = false,
}: {
  value: string;
  onChange: (id: SubtitleStyleId) => void;
  disabled?: boolean;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const current = normalizeSubtitleStyle(value);
  const label =
    SUBTITLE_STYLES.find((s) => s.id === current)?.label || "Classic";
  const headerBg = SUBTITLE_PREVIEW_BG[current];

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)] ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left disabled:opacity-55"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[color:var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headerBg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span
              className="absolute inset-x-0 bottom-0.5 text-center"
              style={{
                ...liveSubtitleStyle(current),
                fontSize: "0.45rem",
                lineHeight: 1,
              }}
            >
              Aa
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Subtitles
            </span>
            <span className="block truncate text-sm font-medium">{label}</span>
          </span>
        </span>
        <span className="shrink-0 text-xs text-[color:var(--muted)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[color:var(--line)] p-2.5 sm:p-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SUBTITLE_STYLES.map((s) => (
              <SubtitleStyleCard
                key={s.id}
                style={s}
                active={current === s.id}
                disabled={disabled}
                onSelect={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
