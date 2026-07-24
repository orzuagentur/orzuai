import type {
  ChartElement,
  EmojiElement,
  IconElement,
  ImageElement,
  PresentationDoc,
  PresentationSlide,
  PresentationThemeId,
  QrElement,
  ShapeElement,
  SlideElement,
  TextElement,
  VideoElement,
} from "./types";
import { CHART_PRESETS, chartElementFromPreset } from "./charts";
import { getTheme } from "./themes";
import QRCode from "qrcode";

export function uid(prefix = "el"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function baseProps(partial?: {
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  animation?: SlideElement["animation"];
  animationDelay?: number;
  animationDuration?: number;
}) {
  return {
    id: uid(),
    x: 12,
    y: 20,
    w: 40,
    h: 20,
    rotation: 0,
    zIndex: 1,
    animation: "none" as const,
    animationDelay: 0,
    animationDuration: 500,
    ...partial,
  };
}

export function createTextElement(
  themeId: PresentationThemeId,
  overrides?: Partial<TextElement>,
): TextElement {
  const theme = getTheme(themeId);
  return {
    ...baseProps({ w: 70, h: 14, x: 15, y: 18 }),
    type: "text",
    text: "Double-click to edit",
    fontSize: 36,
    fontWeight: 700,
    color: theme.titleColor,
    align: "left",
    fontFamily: theme.fontDisplay,
    ...overrides,
  };
}

export function createBodyText(
  themeId: PresentationThemeId,
  overrides?: Partial<TextElement>,
): TextElement {
  const theme = getTheme(themeId);
  return createTextElement(themeId, {
    text: "Add supporting copy here. Keep it short and scannable.",
    fontSize: 18,
    fontWeight: 400,
    color: theme.bodyColor,
    fontFamily: theme.fontBody,
    y: 40,
    h: 22,
    ...overrides,
  });
}

export function createShapeElement(
  shape: ShapeElement["shape"],
  themeId: PresentationThemeId,
  overrides?: Partial<ShapeElement>,
): ShapeElement {
  const theme = getTheme(themeId);
  return {
    ...baseProps({ w: 28, h: 22, x: 36, y: 30 }),
    type: "shape",
    shape,
    fill: theme.accent,
    stroke: "transparent",
    strokeWidth: 0,
    opacity: 1,
    ...overrides,
  };
}

export function createImageElement(
  src: string,
  meta?: Partial<ImageElement>,
): ImageElement {
  return {
    ...baseProps({ w: 42, h: 48, x: 50, y: 20 }),
    type: "image",
    src,
    alt: meta?.alt || "Image",
    objectFit: "cover",
    ...meta,
  };
}

export function createVideoElement(
  src: string,
  meta?: Partial<Omit<VideoElement, "type" | "src">>,
): VideoElement {
  return {
    ...baseProps({ w: 50, h: 40, x: 25, y: 25 }),
    type: "video",
    src,
    autoplay: false,
    loop: true,
    muted: true,
    ...meta,
  };
}

export function createIconElement(
  iconId: string,
  svgUrl: string,
  _themeId: PresentationThemeId,
  overrides?: Partial<IconElement>,
): IconElement {
  return {
    ...baseProps({ w: 12, h: 14, x: 44, y: 38 }),
    type: "icon",
    iconId,
    svgUrl,
    color: "#ffffff",
    ...overrides,
  };
}

export function createEmojiElement(
  emoji: string,
  meta?: Partial<EmojiElement>,
): EmojiElement {
  return {
    ...baseProps({ w: 10, h: 12, x: 45, y: 40 }),
    type: "emoji",
    emoji,
    ...meta,
  };
}

export async function renderQrDataUrl(
  data: string,
  fg = "#000000",
  bg = "#ffffff",
): Promise<string> {
  const payload = data.trim() || "https://orzuai.com";
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 512,
    color: { dark: fg, light: bg },
    errorCorrectionLevel: "M",
  });
}

export async function createQrElement(
  data = "https://orzuai.com",
  overrides?: Partial<Omit<QrElement, "type" | "src">>,
): Promise<QrElement> {
  const fg = overrides?.fg || "#111111";
  const bg = overrides?.bg || "#ffffff";
  const payload = String(overrides?.data ?? data).trim() || "https://orzuai.com";
  const src = await renderQrDataUrl(payload, fg, bg);
  const base = baseProps({ w: 18, h: 22, x: 40, y: 30 });
  return {
    ...base,
    ...overrides,
    id: overrides?.id || base.id,
    type: "qr",
    data: payload,
    fg,
    bg,
    src,
  };
}

export function createChartElement(
  chart: ChartElement["chart"],
  themeId: PresentationThemeId,
  overrides?: Partial<ChartElement>,
): ChartElement {
  const theme = getTheme(themeId);
  const preset = CHART_PRESETS.find((p) => p.kind === chart) ?? CHART_PRESETS[0];
  const fromPreset = chartElementFromPreset(preset, [
    theme.accent,
    "#60a5fa",
    "#4ade80",
    "#f472b6",
    "#a78bfa",
    "#22d3ee",
  ]);
  return {
    ...baseProps({ w: 55, h: 48, x: 22, y: 22 }),
    type: "chart",
    ...fromPreset,
    ...overrides,
  };
}

export type TextStyleId =
  | "title"
  | "subtitle"
  | "body"
  | "caption"
  | "quote"
  | "bullet";

export function createStyledText(
  style: TextStyleId,
  themeId: PresentationThemeId,
): TextElement {
  const theme = getTheme(themeId);
  switch (style) {
    case "title":
      return createTextElement(themeId, {
        text: "Title",
        fontSize: 44,
        fontWeight: 800,
        align: "left",
      });
    case "subtitle":
      return createTextElement(themeId, {
        text: "Subtitle",
        fontSize: 26,
        fontWeight: 600,
        color: theme.bodyColor,
        y: 34,
        h: 10,
      });
    case "body":
      return createBodyText(themeId, {
        text: "Body text — keep lines short for slides.",
        fontSize: 18,
        lineHeight: 1.4,
      });
    case "caption":
      return createTextElement(themeId, {
        text: "Caption or source",
        fontSize: 13,
        fontWeight: 400,
        color: theme.muted,
        y: 78,
        h: 8,
        w: 60,
      });
    case "quote":
      return createTextElement(themeId, {
        text: "“A short quote that lands.”",
        fontSize: 28,
        fontWeight: 500,
        italic: true,
        align: "center",
        x: 12,
        y: 34,
        w: 76,
        h: 22,
      });
    case "bullet":
      return createBodyText(themeId, {
        text: "• First point\n• Second point\n• Third point",
        fontSize: 20,
        lineHeight: 1.55,
        y: 28,
        h: 40,
      });
  }
}

export function createBlankSlide(
  themeId: PresentationThemeId,
  index: number,
): PresentationSlide {
  const theme = getTheme(themeId);
  return {
    id: uid("slide"),
    name: `Slide ${index + 1}`,
    background: theme.slideBg,
    transition: "fade",
    transitionMs: 400,
    notes: "",
    elements: [],
  };
}

export function createTitleSlide(themeId: PresentationThemeId): PresentationSlide {
  const theme = getTheme(themeId);
  return {
    id: uid("slide"),
    name: "Title",
    background: theme.slideBg,
    transition: "fade",
    transitionMs: 450,
    notes: "",
    elements: [
      createTextElement(themeId, {
        text: "Your presentation title",
        fontSize: 48,
        fontWeight: 800,
        x: 10,
        y: 32,
        w: 80,
        h: 16,
        align: "center",
      }),
      createBodyText(themeId, {
        text: "Subtitle · team · date",
        fontSize: 18,
        x: 15,
        y: 52,
        w: 70,
        h: 10,
        align: "center",
        color: theme.muted,
      }),
    ],
  };
}

export function createNewPresentation(title = "Untitled presentation"): PresentationDoc {
  const themeId: PresentationThemeId = "midnight";
  return {
    id: uid("deck"),
    title,
    themeId,
    updatedAt: new Date().toISOString(),
    slides: [createTitleSlide(themeId), createBlankSlide(themeId, 1)],
  };
}

export const STORAGE_KEY = "orzuai.presentation.draft.v1";

export function loadPresentationDraft(): PresentationDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PresentationDoc;
    if (!parsed?.slides?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePresentationDraft(doc: PresentationDoc) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function applyThemeToSlides(
  doc: PresentationDoc,
  themeId: PresentationThemeId,
): PresentationDoc {
  const theme = getTheme(themeId);
  return {
    ...doc,
    themeId,
    slides: doc.slides.map((slide) => ({
      ...slide,
      background: theme.slideBg,
      elements: slide.elements.map((el) => {
        if (el.type === "text") {
          const isTitle = el.fontSize >= 28 || el.fontWeight >= 700;
          return {
            ...el,
            color: isTitle ? theme.titleColor : theme.bodyColor,
            fontFamily: isTitle ? theme.fontDisplay : theme.fontBody,
          };
        }
        if (el.type === "shape") {
          return { ...el, fill: theme.accent };
        }
        if (el.type === "chart") {
          return {
            ...el,
            colors: [theme.accent, ...el.colors.slice(1)],
          };
        }
        return el;
      }),
    })),
  };
}
