export type SlideTransition =
  | "none"
  | "fade"
  | "slide"
  | "push"
  | "zoom"
  | "wipe";

export type ElementAnimation =
  | "none"
  | "fadeIn"
  | "fadeUp"
  | "fadeDown"
  | "zoomIn"
  | "slideLeft"
  | "slideRight"
  | "bounce";

export type ShapeKind =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "star"
  | "diamond"
  | "hexagon"
  | "pentagon"
  | "chevron"
  | "cross"
  | "parallelogram"
  | "trapezoid";

/** Base render families — presets map onto these (60+ catalog cards). */
export type ChartKind =
  | "bar"
  | "barH"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "radar"
  | "scatter"
  | "funnel"
  | "stacked"
  | "gauge"
  | "bullet"
  | "progress"
  | "waterfall"
  | "heatmap"
  | "lollipop"
  | "step"
  | "dualColumn"
  | "ring"
  | "semicircle"
  | "sparkline"
  | "pyramid"
  | "treemap"
  | "bubble"
  | "radialBar"
  | "groupedBar"
  | "stackedBarH"
  | "kpi"
  | "comparison"
  | "slope"
  | "bump"
  | "candlestick"
  | "areaStack"
  | "pieExploded"
  | "donutThin"
  | "meter";

export type PresentationThemeId =
  | "midnight"
  | "ivory"
  | "ocean"
  | "forest"
  | "sunset"
  | "graphite"
  | "rose"
  | "slate"
  | "aurora"
  | "ember"
  | "frost"
  | "orchid"
  | "ink"
  | "sand";

export type SlideElementBase = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
  animation: ElementAnimation;
  animationDelay: number;
  animationDuration: number;
};

export type TextElement = SlideElementBase & {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: string;
  italic?: boolean;
  underline?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
};

export type ShapeElement = SlideElementBase & {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
};

export type ImageElement = SlideElementBase & {
  type: "image";
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
  credit?: string;
  creditUrl?: string;
  provider?: "unsplash" | "pexels" | "upload";
  downloadLocation?: string;
};

/** @deprecated kept for old drafts */
export type VideoElement = SlideElementBase & {
  type: "video";
  src: string;
  poster?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  credit?: string;
  provider?: "pexels" | "upload";
};

export type IconElement = SlideElementBase & {
  type: "icon";
  iconId: string;
  svgUrl: string;
  color: string;
};

export type EmojiElement = SlideElementBase & {
  type: "emoji";
  emoji: string;
  src?: string;
  label?: string;
};

export type QrElement = SlideElementBase & {
  type: "qr";
  data: string;
  fg: string;
  bg: string;
  /** data URL rendered from `data` */
  src: string;
};

export type ChartElement = SlideElementBase & {
  type: "chart";
  chart: ChartKind;
  title: string;
  labels: string[];
  values: number[];
  colors: string[];
};

export type SlideElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | VideoElement
  | IconElement
  | EmojiElement
  | QrElement
  | ChartElement;

export type PresentationSlide = {
  id: string;
  name: string;
  background: string;
  backgroundImage?: string;
  backgroundCredit?: string;
  transition: SlideTransition;
  transitionMs: number;
  notes: string;
  elements: SlideElement[];
};

export type PresentationDoc = {
  id: string;
  title: string;
  themeId: PresentationThemeId;
  updatedAt: string;
  slides: PresentationSlide[];
};

export type RightPanelTab =
  | "design"
  | "text"
  | "media"
  | "shapes"
  | "icons"
  | "emoji"
  | "qr"
  | "charts"
  | "resources"
  | "animate";

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";
