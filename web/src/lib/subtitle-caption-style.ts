import type { CSSProperties } from "react";
import type { SUBTITLE_STYLES } from "@/lib/editor-catalog";
import assStyles from "@/lib/subtitle-ass-styles.json";

export type SubtitleStyleId = (typeof SUBTITLE_STYLES)[number]["id"];

type AssStyleRow = {
  name?: string;
  font?: string;
  size?: string;
  primary?: string;
  outline?: string;
  outline_w?: string;
  shadow?: string;
  bold?: string;
  border_style?: string;
  back?: string;
  align?: string;
};

const ASS = assStyles as Record<string, AssStyleRow>;

/** ASS &H[AABBGGRR] → #RRGGBB (ignores alpha on primary). */
function assColorToCss(ass: string | undefined, fallback = "#ffffff"): string {
  if (!ass) return fallback;
  const hex = ass.replace(/^&H/i, "").padStart(8, "0");
  const bb = hex.slice(2, 4);
  const gg = hex.slice(4, 6);
  const rr = hex.slice(6, 8);
  return `#${rr}${gg}${bb}`;
}

/** ASS back colour with alpha → rgba for box styles. */
function assBackToRgba(ass: string | undefined): string | undefined {
  if (!ass) return undefined;
  const hex = ass.replace(/^&H/i, "").padStart(8, "0");
  const aa = parseInt(hex.slice(0, 2), 16) / 255;
  const bb = parseInt(hex.slice(2, 4), 16);
  const gg = parseInt(hex.slice(4, 6), 16);
  const rr = parseInt(hex.slice(6, 8), 16);
  if (!Number.isFinite(aa)) return undefined;
  return `rgba(${rr},${gg},${bb},${Math.min(1, Math.max(0, aa)).toFixed(2)})`;
}

function fontFamily(font: string | undefined): string | undefined {
  if (!font) return undefined;
  if (/courier/i.test(font)) return "Courier New, monospace";
  if (/georgia/i.test(font)) return "Georgia, serif";
  if (/comic/i.test(font)) return "Comic Sans MS, cursive";
  if (/impact/i.test(font)) return "Impact, Arial Black, sans-serif";
  return undefined;
}

function buildTextShadow(row: AssStyleRow, color: string): string {
  const outlineW = Math.min(10, parseInt(row.outline_w || "0", 10) || 0);
  const shadow = Math.min(8, parseInt(row.shadow || "0", 10) || 0);
  const outlineCss = assColorToCss(row.outline, "#000000");
  const parts: string[] = [];

  if (outlineW >= 7) {
    parts.push(
      `2px 2px 0 ${outlineCss}`,
      `-1px -1px 0 ${outlineCss}`,
      `0 0 2px ${outlineCss}`,
    );
  } else if (outlineW >= 4) {
    parts.push(`0 2px 4px ${outlineCss}`, `0 0 1px ${outlineCss}`);
  } else if (outlineW >= 1) {
    parts.push(`0 1px 3px ${outlineCss}`);
  }

  if (shadow >= 4) {
    parts.push(`0 ${shadow}px ${shadow * 3}px rgba(0,0,0,0.85)`);
  } else if (shadow >= 1) {
    parts.push(`0 2px ${4 + shadow}px rgba(0,0,0,0.75)`);
  }

  if (parts.length === 0) {
    parts.push(`0 2px 5px rgba(0,0,0,0.85)`);
  }

  const glowOutline =
    outlineCss !== "#000000" && outlineCss !== color.toLowerCase();
  if (glowOutline && outlineW <= 4) {
    parts.push(`0 0 10px ${outlineCss}`);
  }

  return parts.join(", ");
}

/** Shared subtitle overlay look (editor + style picker previews). */
export function captionPreviewStyle(style: SubtitleStyleId): CSSProperties {
  const row = ASS[style] ?? ASS.classic;
  const color = assColorToCss(row.primary, "#ffffff");
  const isOutlineFill =
    color === "#000000" &&
    row.outline &&
    assColorToCss(row.outline) !== "#000000";

  const base: CSSProperties = {
    fontWeight: row.bold === "0" ? 600 : 850,
    fontSize: "clamp(0.82rem, 3vw, 1.18rem)",
    lineHeight: 1.18,
    textAlign: "center",
    fontFamily: fontFamily(row.font),
  };

  if (isOutlineFill) {
    const stroke = assColorToCss(row.outline, "#ffffff");
    return {
      ...base,
      color: "transparent",
      WebkitTextStroke: `1.5px ${stroke}`,
      textShadow: "none",
    };
  }

  const back = row.border_style === "3" ? assBackToRgba(row.back) : undefined;
  const styleOut: CSSProperties = {
    ...base,
    color,
    textShadow: buildTextShadow(row, color),
  };

  if (back) {
    styleOut.background = back;
    styleOut.borderRadius = 6;
    styleOut.padding = "6px 12px";
    styleOut.display = "inline-block";
  }

  if (row.align === "2") {
    styleOut.borderLeft = "3px solid var(--accent, #e8a54b)";
    styleOut.textAlign = "left";
  }

  return styleOut;
}

/** Picker cards use smaller type but the same palette as the editor. */
export function subtitlePickerPreviewStyle(
  style: SubtitleStyleId,
): CSSProperties {
  const fromEditor = captionPreviewStyle(style);
  const { fontSize: _drop, ...rest } = fromEditor;
  const row = ASS[style] ?? ASS.classic;
  const sizeNum = parseInt(row.size || "72", 10) || 72;
  const scale =
    sizeNum >= 90 ? "0.62rem" : sizeNum >= 80 ? "0.58rem" : "0.54rem";

  return {
    ...rest,
    fontWeight: fromEditor.fontWeight ?? 800,
    fontSize: scale,
    lineHeight: 1.35,
    maxWidth: "100%",
  };
}
