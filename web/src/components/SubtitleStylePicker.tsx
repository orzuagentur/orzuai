"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { SUBTITLE_STYLES } from "@/lib/editor-catalog";
import {
  subtitlePreviewApiPath,
} from "@/lib/subtitle-preview-sources";
import { subtitlePickerPreviewStyle } from "@/lib/subtitle-caption-style";

export type SubtitleStyleId = (typeof SUBTITLE_STYLES)[number]["id"];

/** Match burned ASS: ~3 words on screen, then advance to the next group */
const PREVIEW_CHUNK = 3;

export function subtitlePreviewBg(id: SubtitleStyleId): string {
  return subtitlePreviewApiPath(id);
}

function SubtitlePreviewImage({ styleId }: { styleId: SubtitleStyleId }) {
  const [failed, setFailed] = useState(false);
  const src = subtitlePreviewBg(styleId);

  if (failed) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-900 to-black"
        aria-hidden
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

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
  return subtitlePickerPreviewStyle(style);
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
  const t = useTranslations("studio.subtitles");
  const previewWords = t("previewSentence").split(/\s+/);
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
      const next = (c + 1) % previewWords.length;
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
  }, [previewWords.length]);

  const css = liveSubtitleStyle(style.id);
  const chunkStart = Math.floor(cursor / PREVIEW_CHUNK) * PREVIEW_CHUNK;
  const chunk = previewWords.slice(chunkStart, chunkStart + PREVIEW_CHUNK);
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
        <SubtitlePreviewImage styleId={style.id} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex min-h-[40%] items-end justify-center px-1 pb-1.5 pt-3 sm:px-2.5 sm:pb-3 sm:pt-6">
          <span
            style={{
              ...css,
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
  embedded = false,
}: {
  value: string;
  onChange: (id: SubtitleStyleId) => void;
  disabled?: boolean;
  className?: string;
  defaultOpen?: boolean;
  embedded?: boolean;
}) {
  const t = useTranslations("studio.subtitles");
  const tc = useTranslations("studio.common");
  const [open, setOpen] = useState(defaultOpen);
  const current = normalizeSubtitleStyle(value);
  const label =
    SUBTITLE_STYLES.find((s) => s.id === current)?.label || tc("classic");

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-[color:var(--line)] ${
        embedded ? "flex h-full min-h-0 flex-col" : ""
      } ${className}`}
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
            <SubtitlePreviewImage styleId={current} />
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
              {t("title")}
            </span>
            <span className="block truncate text-sm font-medium">{label}</span>
          </span>
        </span>
        <span className="shrink-0 text-xs text-[color:var(--muted)]">
          {open ? tc("hide") : tc("show")}
        </span>
      </button>
      {open && (
        <div
          className={`border-t border-[color:var(--line)] p-2.5 sm:p-3 ${
            embedded ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden" : ""
          }`}
        >
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
