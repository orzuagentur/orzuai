"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SlideElement } from "@/lib/presentation/types";
import { renderQrDataUrl } from "@/lib/presentation/factory";

const FONT_OPTIONS = [
  "Syne, system-ui, sans-serif",
  "DM Sans, system-ui, sans-serif",
  "Georgia, serif",
  "Arial, sans-serif",
  "Courier New, monospace",
];

const PRESET_COLORS = [
  "#ffffff",
  "#f2efe8",
  "#e8a54b",
  "#60a5fa",
  "#4ade80",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#f97316",
  "#ef4444",
  "#18181b",
  "#0f172a",
];

const ANIMATIONS = [
  "none",
  "fadeIn",
  "fadeUp",
  "fadeDown",
  "zoomIn",
  "slideLeft",
  "slideRight",
  "bounce",
] as const;

function hex(c: string) {
  return c.startsWith("#") ? c.slice(0, 7) : "#ffffff";
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-[var(--line)] bg-white/[0.02] p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] text-[var(--muted)]">{children}</span>
  );
}

export function ObjectSettingsCard({
  el,
  onPatch,
  onDelete,
  onEditText,
  onClose,
}: {
  el: SlideElement;
  onPatch: (patch: Partial<SlideElement>) => void;
  onDelete: () => void;
  onEditText?: () => void;
  onClose?: () => void;
}) {
  const t = useTranslations("studio.presentation");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const [qrBusy, setQrBusy] = useState(false);
  const title =
    el.type === "text"
      ? "Text"
      : el.type === "chart"
        ? "Diagram"
        : el.type === "shape"
          ? "Shape"
          : el.type === "icon"
            ? t("icon")
            : el.type === "image"
              ? t("photo")
              : el.type === "emoji"
                ? t("emoji")
                : el.type === "qr"
                  ? t("qrCode")
                  : "Object";

  useEffect(() => {
    setQrBusy(false);
  }, [el.id]);

  const refreshQr = async (next: {
    data?: string;
    fg?: string;
    bg?: string;
  }) => {
    if (el.type !== "qr") return;
    setQrBusy(true);
    try {
      const data = next.data ?? el.data;
      const fg = next.fg ?? el.fg;
      const bg = next.bg ?? el.bg;
      const src = await renderQrDataUrl(data, fg, bg);
      onPatch({ data, fg, bg, src });
    } finally {
      setQrBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--fg)]">{title}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {t("changesInstant")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={tCommon("delete")}
            aria-label={t("deleteObject")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--danger)] hover:bg-[var(--danger)]/15"
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
          {onClose && (
            <button
              type="button"
              title={tc("deselect")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {el.type === "text" && (
        <>
          <Section title={t("content")}>
            <textarea
              className="field min-h-[96px] !text-sm"
              value={el.text}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder={t("writeText")}
            />
            {onEditText && (
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-[var(--line)] py-2 text-xs hover:border-[var(--accent)]"
                onClick={onEditText}
              >
                {t("editOnSlide")}
              </button>
            )}
          </Section>
          <Section title={t("typography")}>
            <FieldLabel>Size · {el.fontSize}px</FieldLabel>
            <input
              type="range"
              min={12}
              max={80}
              className="w-full"
              value={el.fontSize}
              onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                <FieldLabel>{t("weight")}</FieldLabel>
                <select
                  className="field !py-1.5 !text-xs"
                  value={el.fontWeight}
                  onChange={(e) =>
                    onPatch({
                      fontWeight: Number(e.target.value) as
                        | 400
                        | 500
                        | 600
                        | 700
                        | 800,
                    })
                  }
                >
                  {[400, 500, 600, 700, 800].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel>{t("font")}</FieldLabel>
                <select
                  className="field !py-1.5 !text-xs"
                  value={el.fontFamily}
                  onChange={(e) => onPatch({ fontFamily: e.target.value })}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f.split(",")[0]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`flex-1 rounded-lg border py-1.5 text-[11px] capitalize ${
                    el.align === a
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--line)]"
                  }`}
                  onClick={() => onPatch({ align: a })}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs italic ${
                  el.italic ? "border-[var(--accent)]" : "border-[var(--line)]"
                }`}
                onClick={() => onPatch({ italic: !el.italic })}
              >
                Italic
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs underline ${
                  el.underline
                    ? "border-[var(--accent)]"
                    : "border-[var(--line)]"
                }`}
                onClick={() => onPatch({ underline: !el.underline })}
              >
                Underline
              </button>
            </div>
          </Section>
          <Section title={t("color")}>
            <div className="flex items-center justify-between">
              <FieldLabel>{t("textColor")}</FieldLabel>
              <input
                type="color"
                value={hex(el.color)}
                onChange={(e) => onPatch({ color: e.target.value })}
              />
            </div>
            <ColorSwatches
              value={el.color}
              onPick={(c) => onPatch({ color: c })}
            />
          </Section>
        </>
      )}

      {el.type === "chart" && (
        <>
          <Section title={t("data")}>
            <FieldLabel>Title</FieldLabel>
            <input
              className="field !py-2 !text-sm"
              value={el.title}
              onChange={(e) => onPatch({ title: e.target.value })}
            />
            <FieldLabel>{t("valuesComma")}</FieldLabel>
            <input
              className="field !py-2 !text-sm"
              value={el.values.join(", ")}
              onChange={(e) =>
                onPatch({
                  values: e.target.value
                    .split(",")
                    .map((v) => Number(v.trim()) || 0),
                })
              }
            />
            <FieldLabel>Labels (comma-separated)</FieldLabel>
            <input
              className="field !py-2 !text-sm"
              value={el.labels.join(", ")}
              onChange={(e) =>
                onPatch({
                  labels: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Section>
          <Section title={t("colors")}>
            <p className="text-[11px] text-[var(--muted)]">
              Each slice / bar has its own color
            </p>
            {(el.colors.length ? el.colors : ["#e8a54b"]).map((c, i) => (
              <label
                key={i}
                className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]"
              >
                Color {i + 1}
                <input
                  type="color"
                  value={hex(c)}
                  onChange={(e) => {
                    const next = [...(el.colors.length ? el.colors : ["#e8a54b"])];
                    next[i] = e.target.value;
                    onPatch({ colors: next });
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              className="w-full rounded-lg border border-dashed border-[var(--line)] py-2 text-xs text-[var(--muted)] hover:border-[var(--accent)]"
              onClick={() =>
                onPatch({
                  colors: [
                    ...(el.colors.length ? el.colors : ["#e8a54b"]),
                    PRESET_COLORS[el.colors.length % PRESET_COLORS.length],
                  ],
                })
              }
            >
              + Add color
            </button>
          </Section>
        </>
      )}

      {el.type === "shape" && (
        <Section title={t("appearance")}>
          <label className="flex items-center justify-between text-[11px] text-[var(--muted)]">
            Fill
            <input
              type="color"
              value={hex(el.fill)}
              onChange={(e) => onPatch({ fill: e.target.value })}
            />
          </label>
          <ColorSwatches value={el.fill} onPick={(c) => onPatch({ fill: c })} />
          <label className="flex items-center justify-between text-[11px] text-[var(--muted)]">
            Stroke
            <input
              type="color"
              value={el.stroke.startsWith("#") ? hex(el.stroke) : "#ffffff"}
              onChange={(e) =>
                onPatch({
                  stroke: e.target.value,
                  strokeWidth: Math.max(1, el.strokeWidth || 1),
                })
              }
            />
          </label>
          <FieldLabel>Stroke width · {el.strokeWidth}</FieldLabel>
          <input
            type="range"
            min={0}
            max={10}
            className="w-full"
            value={el.strokeWidth}
            onChange={(e) => onPatch({ strokeWidth: Number(e.target.value) })}
          />
          <FieldLabel>Opacity · {Math.round(el.opacity * 100)}%</FieldLabel>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            className="w-full"
            value={el.opacity}
            onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
          />
        </Section>
      )}

      {el.type === "icon" && (
        <Section title={t("icon")}>
          <p className="truncate text-[11px] text-[var(--muted)]">{el.iconId}</p>
          <label className="flex items-center justify-between text-[11px] text-[var(--muted)]">
            Color
            <input
              type="color"
              value={hex(el.color)}
              onChange={(e) => onPatch({ color: e.target.value })}
            />
          </label>
          <ColorSwatches
            value={el.color}
            onPick={(c) => onPatch({ color: c })}
          />
        </Section>
      )}

      {el.type === "image" && (
        <Section title={t("photo")}>
          <FieldLabel>{t("altText")}</FieldLabel>
          <input
            className="field !py-2 !text-sm"
            value={el.alt}
            onChange={(e) => onPatch({ alt: e.target.value })}
          />
          <div className="mt-2 flex gap-1">
            {(["cover", "contain"] as const).map((fit) => (
              <button
                key={fit}
                type="button"
                className={`flex-1 rounded-lg border py-2 text-xs capitalize ${
                  el.objectFit === fit
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--line)]"
                }`}
                onClick={() => onPatch({ objectFit: fit })}
              >
                {fit}
              </button>
            ))}
          </div>
          {el.credit && (
            <p className="mt-2 text-[11px] text-[var(--muted)]">© {el.credit}</p>
          )}
        </Section>
      )}

      {el.type === "emoji" && (
        <Section title={t("emoji")}>
          <p className="text-[11px] text-[var(--muted)]">
            {el.label || el.emoji}
          </p>
          {el.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={el.src} alt="" className="mx-auto h-14 w-14" />
          )}
        </Section>
      )}

      {el.type === "qr" && (
        <Section title={t("qrCode")}>
          <FieldLabel>{t("linkOrText")}</FieldLabel>
          <input
            className="field !py-2 !text-sm"
            value={el.data}
            disabled={qrBusy}
            onChange={(e) => onPatch({ data: e.target.value })}
            onBlur={() => void refreshQr({ data: el.data })}
            placeholder="https://…"
          />
          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-black disabled:opacity-50"
            disabled={qrBusy}
            onClick={() => void refreshQr({})}
          >
            {qrBusy ? "Updating…" : t("updateQr")}
          </button>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <label className="flex items-center gap-2">
              Dark
              <input
                type="color"
                value={hex(el.fg)}
                onChange={(e) => void refreshQr({ fg: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2">
              Light
              <input
                type="color"
                value={hex(el.bg)}
                onChange={(e) => void refreshQr({ bg: e.target.value })}
              />
            </label>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={el.src}
            alt="QR preview"
            className="mx-auto mt-3 h-28 w-28 rounded-md bg-white p-1"
          />
        </Section>
      )}

      {el.type === "video" && (
        <Section title={t("video")}>
          <p className="text-[11px] text-[var(--muted)]">
            Legacy video — you can delete this object.
          </p>
        </Section>
      )}

      <Section title={t("animation")}>
        <div className="flex flex-wrap gap-1">
          {ANIMATIONS.map((a) => (
            <button
              key={a}
              type="button"
              className={`rounded-md px-2 py-1 text-[10px] ${
                el.animation === a
                  ? "bg-[var(--accent)] text-black"
                  : "bg-white/5 text-[var(--muted)]"
              }`}
              onClick={() => onPatch({ animation: a })}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label>
            <FieldLabel>{t("delayMs")}</FieldLabel>
            <input
              type="number"
              className="field !py-1.5 !text-xs"
              value={el.animationDelay}
              onChange={(e) =>
                onPatch({ animationDelay: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label>
            <FieldLabel>{t("durationMs")}</FieldLabel>
            <input
              type="number"
              className="field !py-1.5 !text-xs"
              value={el.animationDuration}
              onChange={(e) =>
                onPatch({ animationDuration: Number(e.target.value) || 300 })
              }
            />
          </label>
        </div>
      </Section>
    </div>
  );
}

function ColorSwatches({
  value,
  onPick,
}: {
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          className={`h-6 w-6 rounded-full border ${
            hex(value).toLowerCase() === c.toLowerCase()
              ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40"
              : "border-white/20"
          }`}
          style={{ background: c }}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}
