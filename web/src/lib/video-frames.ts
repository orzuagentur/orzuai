import type { CSSProperties } from "react";

/**
 * Decorative video frames ("рамки") — an outer border / cinematic treatment
 * drawn on top of the finished picture. Mirrors `VIDEO_FRAMES` in the Python
 * worker (`fx_library.py`) so the editor preview matches the exported video.
 *   weight = border/bar thickness as a fraction of the video height
 *   color  = 6-digit RGB hex (no #)
 *   radius = corner radius fraction (preview only; ffmpeg draws square)
 */
export type FrameKind =
  | "solid"
  | "rounded"
  | "double"
  | "dashed"
  | "dotted"
  | "glow"
  | "vignette"
  | "vignette_soft"
  | "letterbox"
  | "polaroid";

export type VideoFrame = {
  id: string;
  label: string;
  kind: FrameKind;
  color: string;
  weight: number;
  radius?: number;
};

export const VIDEO_FRAMES: VideoFrame[] = [
  { id: "frame_white", label: "White", kind: "solid", color: "FFFFFF", weight: 0.014 },
  { id: "frame_white_bold", label: "White Bold", kind: "solid", color: "FFFFFF", weight: 0.028 },
  { id: "frame_black", label: "Black", kind: "solid", color: "000000", weight: 0.02 },
  { id: "frame_gold", label: "Gold", kind: "solid", color: "E8C15A", weight: 0.016 },
  { id: "frame_gold_bold", label: "Gold Bold", kind: "solid", color: "E8C15A", weight: 0.03 },
  { id: "frame_red", label: "Red", kind: "solid", color: "E23B3B", weight: 0.02 },
  { id: "frame_cyan", label: "Cyan", kind: "solid", color: "00E5FF", weight: 0.016 },
  { id: "frame_pink", label: "Pink", kind: "solid", color: "FF4FA3", weight: 0.016 },
  { id: "frame_lime", label: "Lime", kind: "solid", color: "A8FF00", weight: 0.016 },
  { id: "frame_purple", label: "Purple", kind: "solid", color: "9B5CFF", weight: 0.016 },
  { id: "frame_orange", label: "Orange", kind: "solid", color: "FF7A1A", weight: 0.016 },
  { id: "frame_teal", label: "Teal", kind: "solid", color: "14B8A6", weight: 0.016 },
  { id: "frame_navy", label: "Navy", kind: "solid", color: "1E3A8A", weight: 0.02 },
  { id: "frame_mint", label: "Mint", kind: "solid", color: "7CF0C8", weight: 0.016 },
  { id: "frame_round_white", label: "Round White", kind: "rounded", color: "FFFFFF", weight: 0.014, radius: 0.06 },
  { id: "frame_round_black", label: "Round Black", kind: "rounded", color: "000000", weight: 0.02, radius: 0.06 },
  { id: "frame_round_gold", label: "Round Gold", kind: "rounded", color: "E8C15A", weight: 0.016, radius: 0.06 },
  { id: "frame_pill", label: "Pill", kind: "rounded", color: "FFFFFF", weight: 0.012, radius: 0.12 },
  { id: "frame_double_white", label: "Double White", kind: "double", color: "FFFFFF", weight: 0.01 },
  { id: "frame_double_gold", label: "Double Gold", kind: "double", color: "E8C15A", weight: 0.01 },
  { id: "frame_double_black", label: "Double Black", kind: "double", color: "000000", weight: 0.012 },
  { id: "frame_dashed_white", label: "Dashed White", kind: "dashed", color: "FFFFFF", weight: 0.014 },
  { id: "frame_dashed_black", label: "Dashed Black", kind: "dashed", color: "000000", weight: 0.016 },
  { id: "frame_dotted_white", label: "Dotted White", kind: "dotted", color: "FFFFFF", weight: 0.016 },
  { id: "frame_dotted_gold", label: "Dotted Gold", kind: "dotted", color: "E8C15A", weight: 0.016 },
  { id: "frame_glow_cyan", label: "Glow Cyan", kind: "glow", color: "00E5FF", weight: 0.014 },
  { id: "frame_glow_pink", label: "Glow Pink", kind: "glow", color: "FF4FA3", weight: 0.014 },
  { id: "frame_glow_lime", label: "Glow Lime", kind: "glow", color: "A8FF00", weight: 0.014 },
  { id: "frame_glow_purple", label: "Glow Purple", kind: "glow", color: "9B5CFF", weight: 0.014 },
  { id: "frame_glow_gold", label: "Glow Gold", kind: "glow", color: "E8C15A", weight: 0.014 },
  { id: "frame_vignette", label: "Vignette", kind: "vignette", color: "000000", weight: 0 },
  { id: "frame_vignette_soft", label: "Vignette Soft", kind: "vignette_soft", color: "000000", weight: 0 },
  { id: "frame_spotlight", label: "Spotlight", kind: "vignette_soft", color: "000000", weight: 0 },
  { id: "frame_grunge", label: "Grunge", kind: "vignette", color: "000000", weight: 0 },
  { id: "frame_cinematic", label: "Cinematic", kind: "letterbox", color: "000000", weight: 0.11 },
  { id: "frame_cinematic_thin", label: "Cinematic Thin", kind: "letterbox", color: "000000", weight: 0.06 },
  { id: "frame_film_gold", label: "Film Gold", kind: "letterbox", color: "16110A", weight: 0.1 },
  { id: "frame_polaroid", label: "Polaroid", kind: "polaroid", color: "FFFFFF", weight: 0.16 },
  { id: "frame_polaroid_black", label: "Polaroid Black", kind: "polaroid", color: "111111", weight: 0.16 },
];

export const VIDEO_FRAME_IDS: Set<string> = new Set(VIDEO_FRAMES.map((f) => f.id));

export function isVideoFrameId(id: string | null | undefined): boolean {
  return !!id && VIDEO_FRAME_IDS.has(id);
}

export function frameById(id: string | null | undefined): VideoFrame | null {
  if (!id) return null;
  return VIDEO_FRAMES.find((f) => f.id === id) || null;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * CSS for an absolutely-positioned overlay (inset-0, pointer-events none) that
 * renders the frame on top of a video/thumbnail. `base` is the pixel height the
 * frame scales against, so thickness stays proportional in previews of any size.
 */
export function frameToCss(
  frame: VideoFrame | string | null | undefined,
  base = 320,
): CSSProperties {
  const spec = typeof frame === "string" ? frameById(frame) : frame;
  if (!spec) return {};
  const color = `#${spec.color}`;
  const t = Math.max(2, Math.round(spec.weight * base));
  const radius = spec.radius ? Math.round(spec.radius * base) : 0;

  switch (spec.kind) {
    case "solid":
      return { border: `${t}px solid ${color}` };
    case "rounded":
      return { border: `${t}px solid ${color}`, borderRadius: `${radius}px` };
    case "double":
      return { border: `${Math.max(3, t)}px double ${color}` };
    case "dashed":
      return { border: `${t}px dashed ${color}` };
    case "dotted":
      return { border: `${t}px dotted ${color}` };
    case "glow": {
      const g = Math.round(base * 0.06);
      return {
        border: `${t}px solid ${color}`,
        boxShadow: `0 0 ${g}px ${color}, inset 0 0 ${g}px ${hexToRgba(spec.color, 0.4)}`,
      };
    }
    case "vignette":
      return {
        boxShadow: `inset 0 0 ${Math.round(base * 0.34)}px ${Math.round(base * 0.09)}px rgba(0,0,0,0.78)`,
      };
    case "vignette_soft":
      return {
        boxShadow: `inset 0 0 ${Math.round(base * 0.28)}px ${Math.round(base * 0.05)}px rgba(0,0,0,0.5)`,
      };
    case "letterbox": {
      const bar = Math.max(6, Math.round(spec.weight * base));
      return {
        borderTop: `${bar}px solid ${color}`,
        borderBottom: `${bar}px solid ${color}`,
      };
    }
    case "polaroid": {
      const bar = Math.max(8, Math.round(spec.weight * base));
      const border = Math.max(2, Math.round(base * 0.012));
      return {
        border: `${border}px solid ${color}`,
        borderBottomWidth: `${bar}px`,
      };
    }
    default:
      return {};
  }
}
