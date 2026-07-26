import type { CSSProperties } from "react";
import type { PresentationSlide } from "./types";

function firstHexColor(value: string): string {
  return value.match(/#[0-9a-fA-F]{3,8}/)?.[0] || "#0f1117";
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  const n = Number.parseInt(full || "0f1117", 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function cssUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function slideSurfaceStyle(
  slide: PresentationSlide | null | undefined,
  fallbackBackground = "#0f1117",
): CSSProperties {
  const background = slide?.background || fallbackBackground;
  const image = String(slide?.backgroundImage || "").trim();
  if (!image) {
    return { background };
  }

  const light = luminance(firstHexColor(background)) > 0.68;
  const overlay = light
    ? "linear-gradient(120deg, rgba(255,255,255,0.86), rgba(255,255,255,0.34) 48%, rgba(255,255,255,0.9))"
    : "linear-gradient(120deg, rgba(3,7,18,0.74), rgba(3,7,18,0.22) 48%, rgba(3,7,18,0.82))";

  return {
    backgroundColor: firstHexColor(background),
    backgroundImage: `${overlay}, url("${cssUrl(image)}")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  };
}
