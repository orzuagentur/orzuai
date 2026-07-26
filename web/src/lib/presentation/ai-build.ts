import QRCode from "qrcode";
import {
  createBlankSlide,
  createBodyText,
  createChartElement,
  createEmojiElement,
  createIconElement,
  createImageElement,
  createShapeElement,
  createStyledText,
  createTextElement,
  uid,
} from "./factory";
import { getTheme } from "./themes";
import type {
  ChartKind,
  PresentationDoc,
  PresentationSlide,
  PresentationThemeId,
  QrElement,
  ShapeKind,
  SlideElement,
  TextElement,
} from "./types";
import type { PresentationInfoFields } from "./library";
import type { TextStyleId } from "./factory";

type AiTextEl = {
  type: "text";
  role?: TextStyleId | "title" | "subtitle" | "body" | "caption" | "bullet";
  style?: TextStyleId;
  text: string;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiImageEl = {
  type: "image";
  src?: string;
  query?: string;
  alt?: string;
  credit?: string;
  creditUrl?: string;
  provider?: "unsplash" | "pexels";
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiEmojiEl = {
  type: "emoji";
  src?: string;
  emoji?: string;
  query?: string;
  label?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiIconEl = {
  type: "icon";
  iconId?: string;
  svgUrl?: string;
  query?: string;
  color?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiShapeEl = {
  type: "shape";
  shape?: ShapeKind;
  fill?: string;
  opacity?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiChartEl = {
  type: "chart";
  chart?: ChartKind;
  title?: string;
  labels: string[];
  values: number[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type AiEl =
  | AiTextEl
  | AiImageEl
  | AiEmojiEl
  | AiIconEl
  | AiShapeEl
  | AiChartEl;

type AiSlide = {
  name?: string;
  notes?: string;
  layout?: string;
  backgroundImageQuery?: string;
  backgroundImage?: string;
  backgroundCredit?: string;
  elements?: AiEl[];
};

export type AiPresentationPlan = {
  title?: string;
  themeId?: PresentationThemeId;
  slides?: AiSlide[];
};

const THEMES: PresentationThemeId[] = [
  "midnight",
  "ivory",
  "ocean",
  "forest",
  "sunset",
  "graphite",
  "rose",
  "slate",
  "aurora",
  "ember",
  "frost",
  "orchid",
  "ink",
  "sand",
];

const CHARTS: ChartKind[] = [
  "bar",
  "barH",
  "line",
  "area",
  "pie",
  "donut",
  "donutThin",
  "stacked",
  "radar",
  "funnel",
  "gauge",
  "progress",
  "kpi",
  "comparison",
  "lollipop",
  "ring",
  "semicircle",
  "waterfall",
  "groupedBar",
  "stackedBarH",
  "bullet",
  "sparkline",
  "pyramid",
  "treemap",
  "bubble",
  "radialBar",
  "meter",
];

const TEXT_STYLES: TextStyleId[] = [
  "hero",
  "display",
  "title",
  "subtitle",
  "kicker",
  "body",
  "caption",
  "quote",
  "bullet",
  "stat",
  "label",
  "emphasis",
];

function pickTheme(raw: unknown): PresentationThemeId {
  const id = String(raw || "midnight").trim() as PresentationThemeId;
  return THEMES.includes(id) ? id : "midnight";
}

function pickChart(raw: unknown): ChartKind {
  const id = String(raw || "bar").trim() as ChartKind;
  return CHARTS.includes(id) ? id : "bar";
}

function pickTextStyle(raw: unknown): TextStyleId {
  const id = String(raw || "body").trim() as TextStyleId;
  return TEXT_STYLES.includes(id) ? id : "body";
}

async function makeQr(
  data: string,
  overrides?: Partial<Omit<QrElement, "type" | "src">>,
): Promise<QrElement> {
  const fg = overrides?.fg || "#111111";
  const bg = overrides?.bg || "#ffffff";
  const payload = data.trim() || "https://orzuai.com";
  const src = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 512,
    color: { dark: fg, light: bg },
  });
  return {
    id: uid("qr"),
    type: "qr",
    x: overrides?.x ?? 38,
    y: overrides?.y ?? 28,
    w: overrides?.w ?? 24,
    h: overrides?.h ?? 30,
    rotation: 0,
    zIndex: overrides?.zIndex ?? 5,
    animation: "fadeIn",
    animationDelay: 120,
    animationDuration: 500,
    data: payload,
    fg,
    bg,
    src,
  };
}

function mapText(
  themeId: PresentationThemeId,
  el: AiTextEl,
  z: number,
): SlideElement {
  const style = pickTextStyle(el.style || el.role || "body");
  const base = createStyledText(style, themeId);
  const theme = getTheme(themeId);

  const fontSize = Math.max(
    10,
    Math.min(72, Number(el.fontSize) || base.fontSize),
  );
  const fw = Number(el.fontWeight);
  const fontWeight: TextElement["fontWeight"] =
    fw === 400 || fw === 500 || fw === 600 || fw === 700 || fw === 800
      ? fw
      : base.fontWeight;

  const color =
    typeof el.color === "string" && /^#?[0-9a-fA-F]{3,8}$/.test(el.color)
      ? el.color.startsWith("#")
        ? el.color
        : `#${el.color}`
      : base.color;

  // Auto height by style if AI omitted
  const defaultH =
    style === "hero" || style === "stat"
      ? 20
      : style === "display" || style === "title"
        ? 16
        : style === "bullet"
          ? 36
          : style === "quote"
            ? 22
            : style === "kicker" || style === "label"
              ? 6
              : 12;

  return {
    ...base,
    id: uid("tx"),
    text: String(el.text || "").trim() || base.text,
    fontSize,
    fontWeight,
    italic: el.italic ?? base.italic,
    align: el.align || base.align,
    color: color || theme.titleColor,
    letterSpacing:
      el.letterSpacing != null ? Number(el.letterSpacing) : base.letterSpacing,
    lineHeight: el.lineHeight != null ? Number(el.lineHeight) : base.lineHeight,
    x: el.x ?? base.x,
    y: el.y ?? base.y,
    w: el.w ?? base.w,
    h: el.h ?? defaultH,
    zIndex: z,
    animation:
      style === "hero" || style === "stat"
        ? "zoomIn"
        : style === "quote"
          ? "fadeIn"
          : "fadeUp",
    animationDelay: Math.min(520, z * 48),
  };
}

function mapImage(el: AiImageEl, z: number): SlideElement | null {
  const src = String(el.src || "").trim();
  if (!src) return null;
  return createImageElement(src, {
    id: uid("img"),
    alt: String(el.alt || el.query || "Photo"),
    credit: el.credit,
    creditUrl: el.creditUrl,
    provider: el.provider,
    x: el.x ?? 52,
    y: el.y ?? 14,
    w: el.w ?? 42,
    h: el.h ?? 68,
    zIndex: z,
    objectFit: "cover",
    animation: "fadeIn",
    animationDelay: 80,
  });
}

function mapEmoji(el: AiEmojiEl, z: number): SlideElement | null {
  const src = String(el.src || "").trim();
  if (!src && !el.emoji) return null;
  return createEmojiElement(String(el.emoji || "✨"), {
    id: uid("em"),
    src: src || undefined,
    label: el.label || el.query,
    x: el.x ?? 42,
    y: el.y ?? 28,
    w: el.w ?? 16,
    h: el.h ?? 18,
    zIndex: z,
    animation: "zoomIn",
    animationDelay: 100,
  });
}

function mapIcon(
  themeId: PresentationThemeId,
  el: AiIconEl,
  z: number,
): SlideElement | null {
  const svgUrl = String(el.svgUrl || "").trim();
  const iconId = String(el.iconId || el.query || "lucide:sparkles");
  if (!svgUrl) return null;
  const theme = getTheme(themeId);
  return createIconElement(iconId, svgUrl, themeId, {
    id: uid("ic"),
    color: String(el.color || theme.titleColor || "#F8FAFC"),
    x: el.x ?? 12,
    y: el.y ?? 30,
    w: el.w ?? 12,
    h: el.h ?? 14,
    zIndex: z,
    animation: "fadeUp",
    animationDelay: 90,
  });
}

function mapShape(
  themeId: PresentationThemeId,
  el: AiShapeEl,
  z: number,
): SlideElement {
  const theme = getTheme(themeId);
  const shape = (el.shape || "roundRect") as ShapeKind;
  return createShapeElement(shape, themeId, {
    id: uid("sh"),
    fill: String(el.fill || theme.accent),
    opacity: Math.max(0.15, Math.min(1, Number(el.opacity ?? 0.35))),
    x: el.x ?? 6,
    y: el.y ?? 18,
    w: el.w ?? 40,
    h: el.h ?? 55,
    zIndex: z,
    animation: "fadeIn",
  });
}

function mapChart(
  themeId: PresentationThemeId,
  el: AiChartEl,
  z: number,
): SlideElement {
  const chart = createChartElement(pickChart(el.chart), themeId, {
    title: el.title || "Overview",
    labels: (el.labels || []).slice(0, 8).map(String),
    values: (el.values || []).slice(0, 8).map((n) => Number(n) || 0),
  });
  return {
    ...chart,
    id: uid("ch"),
    x: el.x ?? 12,
    y: el.y ?? 28,
    w: el.w ?? 52,
    h: el.h ?? 48,
    zIndex: z,
    animation: "fadeUp",
  };
}

/** Soft professional defaults when AI under-specifies positions for a layout. */
function applyLayoutHints(layout: string, elements: SlideElement[]): SlideElement[] {
  if (!elements.length) return elements;
  return elements.map((el) => {
    if (layout === "split" && el.type === "image") {
      return { ...el, x: 52, y: 10, w: 42, h: 76 };
    }
    if (layout === "cover" && el.type === "text" && el.fontSize >= 28) {
      return { ...el, x: 8, y: 36, w: 70 };
    }
    if (layout === "emoji" && el.type === "emoji") {
      return { ...el, x: 38, y: 16, w: 22, h: 24 };
    }
    return el;
  }).map((el, idx, arr) => {
    if (layout !== "icons" || el.type !== "icon") return el;
    const iconIndex = arr.slice(0, idx + 1).filter((x) => x.type === "icon").length - 1;
    if (iconIndex > 2) return el;
    return { ...el, x: 12 + iconIndex * 30, y: 34, w: 12, h: 14 };
  });
}

function clampFrame<T extends SlideElement>(el: T): T {
  const next = {
    ...el,
    x: Math.max(0, Math.min(96, el.x)),
    y: Math.max(0, Math.min(92, el.y)),
    w: Math.max(4, Math.min(96, el.w)),
    h: Math.max(4, Math.min(92, el.h)),
  } as T;
  if (next.x + next.w > 98) next.w = Math.max(4, 98 - next.x);
  if (next.y + next.h > 94) next.h = Math.max(4, 94 - next.y);
  if (next.type === "text") {
    const chars = next.text.length;
    if (chars > 120 && next.fontSize > 18) {
      next.fontSize = Math.max(18, Math.round(next.fontSize * 0.86));
    }
    if (chars > 220 && next.fontSize > 14) {
      next.fontSize = Math.max(14, Math.round(next.fontSize * 0.78));
      next.lineHeight = next.lineHeight ?? 1.18;
    }
  }
  return next;
}

function buildSlide(
  themeId: PresentationThemeId,
  raw: AiSlide,
  index: number,
): PresentationSlide {
  const theme = getTheme(themeId);
  const blank = createBlankSlide(themeId, index);
  const layout = String(raw.layout || "content").toLowerCase();
  const elements: SlideElement[] = [];
  let z = 1;

  // Subtle accent panel behind content for polish
  if (layout === "quote" || layout === "split") {
    elements.push(
      mapShape(
        themeId,
        {
          type: "shape",
          shape: "roundRect",
          fill: theme.accent,
          opacity: 0.18,
          x: layout === "split" ? 4 : 10,
          y: 14,
          w: layout === "split" ? 44 : 80,
          h: layout === "split" ? 68 : 58,
        },
        z++,
      ),
    );
  }

  for (const el of raw.elements || []) {
    if (!el || typeof el !== "object") continue;
    if (el.type === "text" && String(el.text || "").trim()) {
      elements.push(mapText(themeId, el, z++));
    } else if (el.type === "image") {
      const img = mapImage(el, z++);
      if (img) elements.push(img);
    } else if (el.type === "emoji") {
      const em = mapEmoji(el, z++);
      if (em) elements.push(em);
    } else if (el.type === "icon") {
      const ic = mapIcon(themeId, el, z++);
      if (ic) elements.push(ic);
    } else if (el.type === "shape") {
      elements.push(mapShape(themeId, el, z++));
    } else if (
      el.type === "chart" &&
      Array.isArray(el.labels) &&
      Array.isArray(el.values)
    ) {
      elements.push(mapChart(themeId, el, z++));
    }
  }

  if (raw.backgroundCredit) {
    elements.push(
      mapText(
        themeId,
        {
          type: "text",
          style: "caption",
          text: `Photo: ${String(raw.backgroundCredit).slice(0, 80)}`,
          fontSize: 10,
          fontWeight: 500,
          color: theme.muted,
          x: 72,
          y: 89,
          w: 22,
          h: 5,
          align: "right",
        },
        z++,
      ),
    );
  }

  let finalEls = applyLayoutHints(layout, elements);

  if (!finalEls.some((e) => e.type !== "shape")) {
    finalEls = [
      createTextElement(themeId, {
        text: raw.name || `Slide ${index + 1}`,
        fontSize: 36,
        fontWeight: 800,
        x: 10,
        y: 36,
        w: 80,
        h: 16,
        align: "center",
      }),
    ];
  }

  finalEls = finalEls.map(clampFrame);

  return {
    ...blank,
    id: uid("slide"),
    name: String(raw.name || `Slide ${index + 1}`).slice(0, 60),
    notes: String(raw.notes || ""),
    background: theme.slideBg,
    backgroundImage: String(raw.backgroundImage || "").trim() || undefined,
    backgroundCredit: String(raw.backgroundCredit || "").trim() || undefined,
    elements: finalEls,
  };
}

export async function buildPresentationFromAiPlan(
  plan: AiPresentationPlan,
  info: PresentationInfoFields,
): Promise<PresentationDoc> {
  const themeId = pickTheme(plan.themeId);
  const theme = getTheme(themeId);
  const title =
    String(plan.title || "").trim() ||
    String(info.company || "").trim() ||
    "AI Presentation";

  const slidesRaw = Array.isArray(plan.slides) ? plan.slides : [];
  const slides = slidesRaw.slice(0, 16).map((s, i) => buildSlide(themeId, s, i));

  if (!slides.length) {
    slides.push(buildSlide(themeId, { name: "Title", layout: "cover" }, 0));
  }

  const first = slides[0];
  const brandBits = [info.company, info.author].filter(Boolean).join(" · ");
  if (brandBits) {
    first.elements.push(
      createBodyText(themeId, {
        text: brandBits,
        fontSize: 15,
        color: theme.muted,
        x: 8,
        y: 84,
        w: 70,
        h: 8,
        align: "left",
        zIndex: 30,
      }),
    );
  }

  if (info.website.trim()) {
    const qr = await makeQr(info.website.trim(), {
      x: 72,
      y: 58,
      w: 18,
      h: 24,
      zIndex: 25,
    });
    const contact = createBlankSlide(themeId, slides.length);
    contact.name = "Contact";
    contact.elements = [
      createTextElement(themeId, {
        text: "Scan · Connect",
        fontSize: 40,
        fontWeight: 800,
        x: 8,
        y: 12,
        w: 55,
        h: 12,
      }),
      createBodyText(themeId, {
        text: info.website.trim(),
        x: 8,
        y: 28,
        w: 55,
        h: 10,
      }),
      createShapeElement("roundRect", themeId, {
        x: 8,
        y: 44,
        w: 50,
        h: 28,
        fill: theme.accent,
        opacity: 0.2,
      }),
    ];
    if (info.permissions.trim()) {
      contact.elements.push(
        createBodyText(themeId, {
          text: info.permissions.trim(),
          x: 10,
          y: 48,
          w: 46,
          h: 18,
          fontSize: 14,
        }),
      );
    }
    if (info.notes.trim()) {
      contact.elements.push(
        createBodyText(themeId, {
          text: info.notes.trim(),
          x: 10,
          y: 68,
          w: 46,
          h: 12,
          fontSize: 13,
          color: theme.muted,
        }),
      );
    }
    contact.elements.push(qr);
    slides.push(contact);
  }

  return {
    id: uid("deck"),
    title: title.slice(0, 90),
    themeId,
    updatedAt: new Date().toISOString(),
    slides,
  };
}
