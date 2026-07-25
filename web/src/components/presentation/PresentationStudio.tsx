"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CHART_COUNT, CHART_PRESETS } from "@/lib/presentation/charts";
import {
  downloadPresentationWord,
  printPresentationPdf,
  solidColorFromBackground,
} from "@/lib/presentation/export";
import {
  applyThemeToSlides,
  createBlankSlide,
  createChartElement,
  createEmojiElement,
  createIconElement,
  createImageElement,
  createNewPresentation,
  createQrElement,
  createShapeElement,
  createStyledText,
  loadPresentationDraft,
  savePresentationDraft,
  type TextStyleId,
} from "@/lib/presentation/factory";
import {
  fetchPresentationLibraryItem,
  flushPresentationCloudSync,
  savePresentationDocToLibrary,
} from "@/lib/presentation/library";
import { PRESENTATION_THEMES, getTheme } from "@/lib/presentation/themes";
import type {
  ElementAnimation,
  PresentationDoc,
  ResizeHandle,
  RightPanelTab,
  ShapeKind,
  SlideElement,
  SlideTransition,
} from "@/lib/presentation/types";
import { ChartKindPreview } from "./PresentationChart";
import { ObjectSettingsCard } from "./ObjectSettingsCard";
import { PresentationElementView } from "./PresentationElementView";
import { SlideResourcesPanel } from "./SlideResourcesPanel";
import { SlideThumb } from "./SlideThumb";
import { useSearchParams } from "next/navigation";

type MediaProvider = "unsplash" | "pexels" | "upload";
type DragMode = "move" | "resize" | null;

const TRANSITIONS: SlideTransition[] = [
  "none",
  "fade",
  "slide",
  "push",
  "zoom",
  "wipe",
];
const ANIMATIONS: ElementAnimation[] = [
  "none",
  "fadeIn",
  "fadeUp",
  "fadeDown",
  "zoomIn",
  "slideLeft",
  "slideRight",
  "bounce",
];
const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "roundRect", label: "Rounded" },
  { id: "ellipse", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Star" },
  { id: "hexagon", label: "Hexagon" },
  { id: "pentagon", label: "Pentagon" },
  { id: "arrow", label: "Arrow" },
  { id: "chevron", label: "Chevron" },
  { id: "line", label: "Line" },
  { id: "cross", label: "Cross" },
  { id: "parallelogram", label: "Parallelogram" },
  { id: "trapezoid", label: "Trapezoid" },
];

const TEXT_STYLES: { id: TextStyleId; label: string; hint: string }[] = [
  { id: "hero", label: "Hero", hint: "56px impact" },
  { id: "display", label: "Display", hint: "48px big" },
  { id: "title", label: "Title", hint: "40px headline" },
  { id: "subtitle", label: "Subtitle", hint: "Secondary" },
  { id: "kicker", label: "Kicker", hint: "Small caps" },
  { id: "stat", label: "Stat", hint: "Big number" },
  { id: "emphasis", label: "Emphasis", hint: "Key line" },
  { id: "body", label: "Body", hint: "Paragraph" },
  { id: "bullet", label: "Bullets", hint: "List points" },
  { id: "quote", label: "Quote", hint: "Pull quote" },
  { id: "caption", label: "Caption", hint: "Small note" },
  { id: "label", label: "Label", hint: "Tiny tag" },
];

const FONT_OPTIONS = [
  "Syne, system-ui, sans-serif",
  "DM Sans, system-ui, sans-serif",
  "Georgia, serif",
  "Arial, sans-serif",
  "Courier New, monospace",
];

type MediaItem = {
  id: string;
  src: string;
  thumb?: string;
  alt?: string;
  author?: string;
  pageUrl?: string;
  downloadLocation?: string;
  provider: MediaProvider;
};

type IconRow = {
  id: string;
  name: string;
  prefix: string;
  svgUrl: string;
};

type EmojiRow = {
  hex: string;
  public_url: string;
  name: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function PresentationStudio() {
  const searchParams = useSearchParams();
  const fromVault = searchParams.get("from") === "vault";
  const backHref = fromVault
    ? "/dashboard/favorites?tab=presentations"
    : "/dashboard/creators";
  const backLabel = fromVault ? "← My presentations" : "← Creators";
  const [doc, setDoc] = useState<PresentationDoc>(() => createNewPresentation());
  const [hydrated, setHydrated] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<RightPanelTab>("design");
  const [presenting, setPresenting] = useState(false);
  const [presentAnimKey, setPresentAnimKey] = useState(0);
  const [busyExport, setBusyExport] = useState(false);
  const [mediaQ, setMediaQ] = useState("business");
  const [mediaProvider, setMediaProvider] = useState<MediaProvider>("unsplash");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [iconQ, setIconQ] = useState("");
  const [icons, setIcons] = useState<IconRow[]>([]);
  const [iconPage, setIconPage] = useState(1);
  const [iconHasMore, setIconHasMore] = useState(false);
  const [iconLoading, setIconLoading] = useState(false);
  const [emojiQ, setEmojiQ] = useState("");
  const [emojis, setEmojis] = useState<EmojiRow[]>([]);
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [qrDraft, setQrDraft] = useState("https://orzuai.com");
  const exportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    handle: ResizeHandle | null;
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const slide = doc.slides[slideIndex] ?? doc.slides[0];
  const selected = slide?.elements.find((e) => e.id === selectedId) ?? null;
  const theme = getTheme(doc.themeId);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id) {
        const item = await fetchPresentationLibraryItem(id);
        if (cancelled) return;
        if (item?.doc?.slides?.length) {
          setDoc(item.doc);
          setHydrated(true);
          if (params.get("export") === "pdf") {
            window.setTimeout(() => printPresentationPdf(), 500);
          }
          return;
        }
      }
      const draft = loadPresentationDraft();
      if (cancelled) return;
      if (draft) setDoc(draft);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      savePresentationDraft(doc);
      savePresentationDocToLibrary(doc);
    }, 400);
    return () => window.clearTimeout(t);
  }, [doc, hydrated]);

  useEffect(() => {
    return () => {
      void flushPresentationCloudSync();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (presenting) {
        if (e.key === "Escape") setPresenting(false);
        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          setSlideIndex((i) => Math.min(doc.slides.length - 1, i + 1));
          setPresentAnimKey((k) => k + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSlideIndex((i) => Math.max(0, i - 1));
          setPresentAnimKey((k) => k + 1);
        }
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        updateSlideElements((els) => els.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, selectedId, doc.slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDoc = useCallback((fn: (d: PresentationDoc) => PresentationDoc) => {
    setDoc((d) => fn(d));
  }, []);

  const updateSlideElements = useCallback(
    (fn: (els: SlideElement[]) => SlideElement[]) => {
      setDoc((d) => ({
        ...d,
        slides: d.slides.map((s, i) =>
          i === slideIndex ? { ...s, elements: fn(s.elements) } : s,
        ),
      }));
    },
    [slideIndex],
  );

  const patchSelected = useCallback(
    (patch: Partial<SlideElement>) => {
      if (!selectedId) return;
      updateSlideElements((els) =>
        els.map((el) =>
          el.id === selectedId ? ({ ...el, ...patch } as SlideElement) : el,
        ),
      );
    },
    [selectedId, updateSlideElements],
  );

  const addElement = useCallback(
    (el: SlideElement) => {
      updateSlideElements((els) => [...els, { ...el, zIndex: els.length + 1 }]);
      setSelectedId(el.id);
    },
    [updateSlideElements],
  );

  const searchMedia = useCallback(async () => {
    if (mediaProvider === "upload") return;
    setMediaLoading(true);
    setMediaError(null);
    try {
      if (mediaProvider === "unsplash") {
        const res = await fetch(
          `/api/unsplash/photos?q=${encodeURIComponent(mediaQ)}&perPage=24`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unsplash failed");
        setMediaItems(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.items || []).map((p: any) => ({
            id: p.id,
            src: p.urls?.regular || p.urls?.full,
            thumb: p.urls?.small || p.urls?.thumb,
            alt: p.alt || p.description || "Photo",
            author: p.photographer?.name,
            pageUrl: p.unsplashUrl,
            downloadLocation: p.downloadLocation,
            provider: "unsplash" as const,
          })),
        );
      } else {
        const res = await fetch(
          `/api/media/search?q=${encodeURIComponent(mediaQ)}&type=photo&page=1`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Pexels failed");
        setMediaItems(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.items || [])
            .filter((it: { kind?: string }) => it.kind === "photo")
            .map((it: {
              id: string;
              downloadUrl?: string;
              previewUrl?: string;
              thumb?: string;
              title?: string;
              author?: string;
              pageUrl?: string;
            }) => ({
              id: it.id,
              src: it.downloadUrl || it.previewUrl || it.thumb || "",
              thumb: it.thumb || it.previewUrl,
              alt: it.title || "Photo",
              author: it.author,
              pageUrl: it.pageUrl,
              provider: "pexels" as const,
            })),
        );
      }
    } catch (e) {
      setMediaItems([]);
      setMediaError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setMediaLoading(false);
    }
  }, [mediaProvider, mediaQ]);

  useEffect(() => {
    if (panel === "media" && mediaProvider !== "upload") void searchMedia();
  }, [panel, mediaProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchIcons = useCallback(
    async (page = 1, append = false) => {
      setIconLoading(true);
      try {
        const q = iconQ.trim();
        const params = new URLSearchParams({
          prefix: "lucide",
          page: String(page),
          limit: "120",
        });
        if (q) params.set("q", q);
        const res = await fetch(`/api/iconify/icons?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Icons failed");
        const next = (data.items || []) as IconRow[];
        setIcons((prev) => (append ? [...prev, ...next] : next));
        setIconPage(page);
        setIconHasMore(Boolean(data.hasMore));
      } catch {
        if (!append) setIcons([]);
        setIconHasMore(false);
      } finally {
        setIconLoading(false);
      }
    },
    [iconQ],
  );

  useEffect(() => {
    if (panel === "icons") void searchIcons(1, false);
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchEmojis = useCallback(async () => {
    setEmojiLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "96" });
      if (emojiQ.trim()) params.set("q", emojiQ.trim());
      const res = await fetch(`/api/openmoji?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Emoji failed");
      setEmojis(data.items || []);
    } catch {
      setEmojis([]);
    } finally {
      setEmojiLoading(false);
    }
  }, [emojiQ]);

  useEffect(() => {
    if (panel === "emoji") void searchEmojis();
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDownEl = (e: ReactPointerEvent, id: string) => {
    if (presenting || editingId) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.target as HTMLElement;
    const el = slide.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    setSelectedId(id);
    const handle = (target.dataset.resize as ResizeHandle | undefined) || null;
    const mode: DragMode = handle ? "resize" : "move";
    dragRef.current = {
      mode,
      handle,
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.w,
      origH: el.h,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const box = canvasRef.current?.getBoundingClientRect();
      if (!drag || !box) return;
      const dx = ((e.clientX - drag.startX) / box.width) * 100;
      const dy = ((e.clientY - drag.startY) / box.height) * 100;
      updateSlideElements((els) =>
        els.map((el) => {
          if (el.id !== drag.id) return el;
          if (drag.mode === "move") {
            return {
              ...el,
              x: clamp(drag.origX + dx, -20, 95),
              y: clamp(drag.origY + dy, -20, 95),
            };
          }
          const h = drag.handle || "se";
          let x = drag.origX;
          let y = drag.origY;
          let w = drag.origW;
          let ht = drag.origH;
          if (h.includes("e")) w = drag.origW + dx;
          if (h.includes("s")) ht = drag.origH + dy;
          if (h.includes("w")) {
            w = drag.origW - dx;
            x = drag.origX + dx;
          }
          if (h.includes("n")) {
            ht = drag.origH - dy;
            y = drag.origY + dy;
          }
          // Keep minimum size; adjust origin if clamped
          if (w < 5) {
            if (h.includes("w")) x = drag.origX + drag.origW - 5;
            w = 5;
          }
          if (ht < 5) {
            if (h.includes("n")) y = drag.origY + drag.origH - 5;
            ht = 5;
          }
          return {
            ...el,
            x: clamp(x, -20, 95),
            y: clamp(y, -20, 95),
            w: clamp(w, 5, 120),
            h: clamp(ht, 5, 120),
          };
        }),
      );
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateSlideElements]);

  const insertPhoto = async (item: MediaItem) => {
    if (item.provider === "unsplash" && item.downloadLocation) {
      try {
        await fetch("/api/unsplash/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloadLocation: item.downloadLocation }),
        });
      } catch {
        /* non-blocking */
      }
    }
    addElement(
      createImageElement(item.src, {
        alt: item.alt || "Image",
        credit: item.author,
        creditUrl: item.pageUrl,
        provider: item.provider,
        downloadLocation: item.downloadLocation,
      }),
    );
  };

  if (presenting && slide) {
    return (
      <div
        className="fixed inset-0 z-[80] flex flex-col bg-black"
        onClick={() => {
          setSlideIndex((i) => Math.min(doc.slides.length - 1, i + 1));
          setPresentAnimKey((k) => k + 1);
        }}
      >
        <div className="flex items-center justify-between px-4 py-2 text-sm text-white/70">
          <span>
            {slideIndex + 1} / {doc.slides.length}
          </span>
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-1 hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              setPresenting(false);
            }}
          >
            Exit (Esc)
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div
            key={presentAnimKey}
            className={`pres-slide-transition-${slide.transition} relative aspect-video w-full max-w-6xl overflow-hidden shadow-2xl`}
            style={{
              background: slide.background,
              containerType: "inline-size",
            }}
          >
            {slide.elements
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <PresentationElementView
                  key={el.id}
                  el={el}
                  selected={false}
                  playing
                  interactive={false}
                />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pres-studio flex h-[100dvh] flex-col overflow-hidden bg-[#0a0b0e]">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2">
          <Link
            href={backHref}
            className="rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          >
            {backLabel}
          </Link>
          {!fromVault && (
            <Link
              href="/dashboard/favorites?tab=presentations"
              className="rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
            >
              My presentations
            </Link>
          )}
          <input
            className="field !w-auto min-w-[10rem] flex-1 !py-1.5 !text-sm sm:max-w-xs"
            value={doc.title}
            onChange={(e) =>
              updateDoc((d) => ({ ...d, title: e.target.value }))
            }
            aria-label="Presentation title"
          />
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              title="New presentation"
              className="btn-ghost flex h-9 w-9 items-center justify-center !p-0"
              onClick={() => {
                if (
                  confirm("Start a new presentation? Current draft is saved.")
                ) {
                  setDoc(createNewPresentation());
                  setSlideIndex(0);
                  setSelectedId(null);
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                title="Export"
                className="btn-ghost flex h-9 items-center gap-1.5 !px-3 text-xs"
                disabled={busyExport}
                onClick={() => setExportOpen((v) => !v)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 3v12" strokeLinecap="round" />
                  <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 21h14" strokeLinecap="round" />
                </svg>
                Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] py-1 shadow-2xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-white/5"
                    onClick={() => {
                      setExportOpen(false);
                      printPresentationPdf();
                    }}
                  >
                    <span className="font-semibold text-[var(--accent)]">PDF</span>
                    All slides
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-white/5"
                    disabled={busyExport}
                    onClick={async () => {
                      setExportOpen(false);
                      setBusyExport(true);
                      try {
                        await downloadPresentationWord(doc);
                      } catch (e) {
                        alert(
                          e instanceof Error
                            ? e.message
                            : "Word export failed",
                        );
                      } finally {
                        setBusyExport(false);
                      }
                    }}
                  >
                    <span className="font-semibold text-[var(--accent)]">Word</span>
                    .doc file
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              title="Present"
              className="btn-primary flex h-9 items-center gap-1.5 !px-3 text-xs"
              onClick={() => {
                setPresentAnimKey((k) => k + 1);
                setPresenting(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7L8 5Z" />
              </svg>
              Present
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[148px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-[var(--line)] bg-[#0c0d10] p-2 sm:flex">
            {doc.slides.map((s, i) => (
              <SlideThumb
                key={s.id}
                slide={s}
                index={i}
                active={i === slideIndex}
                onClick={() => {
                  setSlideIndex(i);
                  setSelectedId(null);
                }}
              />
            ))}
            <button
              type="button"
              className="rounded-md border border-dashed border-[var(--line)] py-3 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={() => {
                updateDoc((d) => ({
                  ...d,
                  slides: [
                    ...d.slides,
                    createBlankSlide(d.themeId, d.slides.length),
                  ],
                }));
                setSlideIndex(doc.slides.length);
              }}
            >
              + Slide
            </button>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col bg-[#08090c]">
            <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--line)] px-2 py-1.5 sm:hidden">
              {doc.slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`relative h-10 w-[4.5rem] shrink-0 overflow-hidden rounded border ${
                    i === slideIndex
                      ? "border-[var(--accent)]"
                      : "border-[var(--line)]"
                  }`}
                  style={{ background: s.background }}
                  onClick={() => setSlideIndex(i)}
                >
                  <span className="absolute inset-0 scale-[0.35] origin-top-left pointer-events-none" style={{ width: "280%", height: "280%", containerType: "inline-size" }}>
                    {s.elements.slice(0, 8).map((el) => (
                      <PresentationElementView
                        key={el.id}
                        el={el}
                        selected={false}
                        interactive={false}
                      />
                    ))}
                  </span>
                  <span className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[9px]">
                    {i + 1}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="h-10 shrink-0 rounded bg-white/5 px-2 text-xs text-[var(--muted)]"
                onClick={() => {
                  updateDoc((d) => ({
                    ...d,
                    slides: [
                      ...d.slides,
                      createBlankSlide(d.themeId, d.slides.length),
                    ],
                  }));
                  setSlideIndex(doc.slides.length);
                }}
              >
                +
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-3 sm:p-6">
              <div
                ref={canvasRef}
                className="pres-canvas relative aspect-video w-full max-w-4xl overflow-hidden rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                style={{
                  background: slide?.background || theme.slideBg,
                  containerType: "inline-size",
                }}
                onClick={() => {
                  setSelectedId(null);
                  setEditingId(null);
                }}
              >
                {slide?.elements
                  .slice()
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((el) => (
                    <PresentationElementView
                      key={el.id}
                      el={el}
                      selected={el.id === selectedId}
                      editing={el.id === editingId}
                      onSelect={(id) => {
                        setSelectedId(id);
                        if (editingId && editingId !== id) setEditingId(null);
                      }}
                      onPointerDown={onPointerDownEl}
                      onDoubleClick={(id) => {
                        const target = slide.elements.find((x) => x.id === id);
                        if (target?.type === "text") {
                          setSelectedId(id);
                          setEditingId(id);
                        }
                      }}
                      onChangeText={(id, text) => {
                        updateSlideElements((els) =>
                          els.map((e) =>
                            e.id === id && e.type === "text"
                              ? { ...e, text }
                              : e,
                          ),
                        );
                      }}
                      onEndEdit={() => setEditingId(null)}
                    />
                  ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-1 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-2">
              {(
                [
                  ["design", "Theme"],
                  ["text", "Text"],
                  ["media", "Photos"],
                  ["shapes", "Shapes"],
                  ["icons", "Icons"],
                  ["emoji", "Emoji"],
                  ["qr", "QR"],
                  ["charts", "Charts"],
                  ["resources", "Resources"],
                  ["animate", "Animate"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setPanel(id);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    !selected && panel === id
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--fg)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </main>

          <aside className="flex w-full max-w-[340px] shrink-0 flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)] max-sm:absolute max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:max-h-[42vh] max-sm:w-full max-sm:max-w-none max-sm:rounded-t-xl max-sm:border-t sm:relative sm:max-h-none">
            <div className="border-b border-[var(--line)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {selected ? "Object" : panel === "resources" ? "Resources" : panel}
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-sm">
              {selected ? (
                <ObjectSettingsCard
                  el={selected}
                  onPatch={(patch) => {
                    if (!selectedId) return;
                    updateSlideElements((els) =>
                      els.map((e) =>
                        e.id === selectedId
                          ? ({ ...e, ...patch } as SlideElement)
                          : e,
                      ),
                    );
                  }}
                  onDelete={() => {
                    if (!selectedId) return;
                    updateSlideElements((els) =>
                      els.filter((e) => e.id !== selectedId),
                    );
                    setSelectedId(null);
                    setEditingId(null);
                  }}
                  onEditText={
                    selected.type === "text"
                      ? () => setEditingId(selected.id)
                      : undefined
                  }
                  onClose={() => {
                    setSelectedId(null);
                    setEditingId(null);
                  }}
                />
              ) : panel === "resources" ? (
                <SlideResourcesPanel
                  slideIndex={slideIndex}
                  slideName={slide?.name || `Slide ${slideIndex + 1}`}
                  elements={slide?.elements || []}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
              {panel === "design" && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--muted)]">
                    Pick a theme. Titles, accents and empty slides update.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESENTATION_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          updateDoc((d) => applyThemeToSlides(d, t.id))
                        }
                        className={`rounded-lg border p-2 text-left transition ${
                          doc.themeId === t.id
                            ? "border-[var(--accent)]"
                            : "border-[var(--line)] hover:border-white/25"
                        }`}
                      >
                        <div className="mb-2 flex h-10 overflow-hidden rounded">
                          {t.preview.map((c) => (
                            <span
                              key={c}
                              className="flex-1"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                        <div className="text-xs font-semibold">{t.name}</div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {t.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  {slide && (
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--muted)]">
                        Slide name
                      </span>
                      <input
                        className="field !py-2 !text-sm"
                        value={slide.name}
                        onChange={(e) =>
                          updateDoc((d) => ({
                            ...d,
                            slides: d.slides.map((s, i) =>
                              i === slideIndex
                                ? { ...s, name: e.target.value }
                                : s,
                            ),
                          }))
                        }
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="btn-ghost w-full text-xs text-[var(--danger)]"
                    onClick={() => {
                      if (doc.slides.length <= 1) return;
                      updateDoc((d) => ({
                        ...d,
                        slides: d.slides.filter((_, i) => i !== slideIndex),
                      }));
                      setSlideIndex((i) => Math.max(0, i - 1));
                    }}
                  >
                    Delete slide
                  </button>
                </div>
              )}

              {panel === "text" && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--muted)]">
                    Text styles — click a card to insert.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEXT_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="rounded-lg border border-[var(--line)] p-2.5 text-left hover:border-[var(--accent)]"
                        onClick={() =>
                          addElement(createStyledText(s.id, doc.themeId))
                        }
                      >
                        <div className="text-xs font-semibold">{s.label}</div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {s.hint}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>
              )}

              {panel === "media" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["unsplash", "Unsplash"],
                        ["pexels", "Pexels"],
                        ["upload", "Upload"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMediaProvider(id)}
                        className={`rounded px-2 py-1 text-[10px] ${
                          mediaProvider === id
                            ? "bg-[var(--accent)] text-black"
                            : "bg-white/5 text-[var(--muted)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {mediaProvider !== "upload" ? (
                    <>
                      <div className="flex gap-1">
                        <input
                          className="field !py-1.5 !text-xs"
                          value={mediaQ}
                          onChange={(e) => setMediaQ(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void searchMedia();
                          }}
                          placeholder="Search photos…"
                        />
                        <button
                          type="button"
                          className="btn-primary shrink-0 !px-3 text-xs"
                          onClick={() => void searchMedia()}
                        >
                          Go
                        </button>
                      </div>
                      {mediaError && (
                        <p className="text-[11px] text-[var(--danger)]">
                          {mediaError}
                        </p>
                      )}
                      {mediaLoading ? (
                        <p className="text-xs text-[var(--muted)]">Loading…</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {mediaItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="relative aspect-square overflow-hidden rounded border border-[var(--line)]"
                              onClick={() => void insertPhoto(item)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.thumb || item.src}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-1 text-[8px] text-white/80">
                                {item.provider}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            addElement(
                              createImageElement(URL.createObjectURL(f), {
                                alt: f.name,
                                provider: "upload",
                              }),
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="btn-primary w-full text-xs"
                        onClick={() => fileRef.current?.click()}
                      >
                        Upload photo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {panel === "shapes" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        className="rounded-lg border border-[var(--line)] px-2 py-3 text-left hover:border-[var(--accent)]"
                        onClick={() =>
                          addElement(createShapeElement(shape.id, doc.themeId))
                        }
                      >
                        <div className="mb-2 h-8 text-[var(--accent)]">
                          <ShapeMini kind={shape.id} />
                        </div>
                        <span className="text-[11px] font-medium">
                          {shape.label}
                        </span>
                      </button>
                    ))}
                  </div>

                </div>
              )}

              {panel === "icons" && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--muted)]">
                    Icons insert in white — change color after selecting.
                  </p>
                  <div className="flex gap-1">
                    <input
                      className="field !py-1.5 !text-xs"
                      value={iconQ}
                      onChange={(e) => setIconQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void searchIcons(1, false);
                      }}
                      placeholder="Search all icons…"
                    />
                    <button
                      type="button"
                      className="btn-primary shrink-0 !px-3 text-xs"
                      onClick={() => void searchIcons(1, false)}
                    >
                      Go
                    </button>
                  </div>
                  {iconLoading && icons.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">Loading…</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-5 gap-1.5">
                        {icons.map((ic) => (
                          <button
                            key={`${ic.prefix}:${ic.name}`}
                            type="button"
                            title={ic.name}
                            className="flex aspect-square items-center justify-center rounded border border-[var(--line)] bg-[#1a1b20] p-2 hover:border-[var(--accent)]"
                            onClick={() =>
                              addElement(
                                createIconElement(
                                  `${ic.prefix}:${ic.name}`,
                                  ic.svgUrl,
                                  doc.themeId,
                                  { color: "#ffffff" },
                                ),
                              )
                            }
                          >
                            <span
                              className="block h-5 w-5"
                              style={{
                                backgroundColor: "#ffffff",
                                WebkitMask: `url(${ic.svgUrl}) center / contain no-repeat`,
                                mask: `url(${ic.svgUrl}) center / contain no-repeat`,
                              }}
                            />
                          </button>
                        ))}
                      </div>
                      {iconHasMore && (
                        <button
                          type="button"
                          className="btn-ghost w-full text-xs"
                          disabled={iconLoading}
                          onClick={() => void searchIcons(iconPage + 1, true)}
                        >
                          {iconLoading ? "Loading…" : "Load more icons"}
                        </button>
                      )}
                    </>
                  )}

                </div>
              )}

              {panel === "emoji" && (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    <input
                      className="field !py-1.5 !text-xs"
                      value={emojiQ}
                      onChange={(e) => setEmojiQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void searchEmojis();
                      }}
                      placeholder="Search emoji…"
                    />
                    <button
                      type="button"
                      className="btn-primary shrink-0 !px-3 text-xs"
                      onClick={() => void searchEmojis()}
                    >
                      Go
                    </button>
                  </div>
                  {emojiLoading ? (
                    <p className="text-xs text-[var(--muted)]">Loading…</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {emojis.map((em) => (
                        <button
                          key={em.hex}
                          type="button"
                          title={em.name || em.hex}
                          className="flex aspect-square items-center justify-center rounded border border-[var(--line)] bg-white/5 p-1.5 hover:border-[var(--accent)]"
                          onClick={() =>
                            addElement(
                              createEmojiElement(em.name || "emoji", {
                                src: em.public_url,
                                label: em.name || em.hex,
                              }),
                            )
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={em.public_url}
                            alt=""
                            className="h-7 w-7 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {panel === "qr" && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--muted)]">
                    Create a QR code and place it on the slide.
                  </p>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[var(--muted)]">
                      URL or text
                    </span>
                    <input
                      className="field !py-2 !text-sm"
                      value={qrDraft}
                      onChange={(e) => setQrDraft(e.target.value)}
                      placeholder="https://…"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-primary w-full text-xs"
                    onClick={async () => {
                      const el = await createQrElement(qrDraft);
                      addElement(el);
                    }}
                  >
                    + Add QR to slide
                  </button>
                </div>
              )}

              {panel === "charts" && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--muted)]">
                    {CHART_COUNT}+ diagrams with live previews — click to add.
                  </p>
                  <input
                    className="field !py-1.5 !text-xs"
                    value={chartFilter}
                    onChange={(e) => setChartFilter(e.target.value)}
                    placeholder="Filter charts…"
                  />
                  <div className="grid max-h-[none] grid-cols-2 gap-2">
                    {CHART_PRESETS.filter((preset) => {
                      const q = chartFilter.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        preset.label.toLowerCase().includes(q) ||
                        preset.hint.toLowerCase().includes(q) ||
                        preset.kind.toLowerCase().includes(q) ||
                        preset.title.toLowerCase().includes(q)
                      );
                    }).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="rounded-lg border border-[var(--line)] p-2 text-left transition hover:border-[var(--accent)]"
                        onClick={() =>
                          addElement(
                            createChartElement(preset.kind, doc.themeId, {
                              title: preset.title,
                              labels: preset.labels,
                              values: preset.values,
                              colors: preset.colors,
                            }),
                          )
                        }
                      >
                        <div className="mb-1 overflow-hidden rounded bg-black/25">
                          <ChartKindPreview
                            kind={preset.kind}
                            accent={preset.colors?.[0] || theme.accent}
                          />
                        </div>
                        <div className="text-xs font-semibold">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {preset.hint}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>
              )}

              {panel === "animate" && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                      Slide transition
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {TRANSITIONS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`rounded px-2 py-1 text-[10px] capitalize ${
                            slide?.transition === t
                              ? "bg-[var(--accent)] text-black"
                              : "bg-white/5 text-[var(--muted)]"
                          }`}
                          onClick={() =>
                            updateDoc((d) => ({
                              ...d,
                              slides: d.slides.map((s, i) =>
                                i === slideIndex ? { ...s, transition: t } : s,
                              ),
                            }))
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Select an object to edit animation in Object settings.
                  </p>
                </div>
              )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Hidden multi-page print tree — every slide becomes a PDF page */}
      <div className="pres-print-root" aria-hidden>
        {doc.slides.map((s, i) => {
          const solid = solidColorFromBackground(s.background);
          return (
            <div
              key={s.id}
              className="pres-print-page"
              style={{
                backgroundColor: solid,
                backgroundImage: s.background.includes("gradient")
                  ? s.background
                  : undefined,
                background: s.background,
                color: "#f2efe8",
              }}
            >
              <div
                className="relative h-full w-full"
                style={{ containerType: "inline-size" }}
              >
                {s.elements
                  .slice()
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((el) => (
                    <PresentationElementView
                      key={el.id}
                      el={el}
                      selected={false}
                      interactive={false}
                    />
                  ))}
                <span className="pres-print-folio">
                  {i + 1} / {doc.slides.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

type TextElementWeight = 400 | 500 | 600 | 700 | 800;

function ShapeMini({ kind }: { kind: ShapeKind }) {
  const fill = "currentColor";
  return (
    <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden>
      {kind === "ellipse" && <ellipse cx="20" cy="14" rx="12" ry="10" fill={fill} />}
      {kind === "triangle" && <polygon points="20,2 36,26 4,26" fill={fill} />}
      {kind === "diamond" && <polygon points="20,2 36,14 20,26 4,14" fill={fill} />}
      {kind === "star" && (
        <polygon
          points="20,2 23,11 33,11 25,16 28,26 20,20 12,26 15,16 7,11 17,11"
          fill={fill}
        />
      )}
      {kind === "arrow" && (
        <polygon points="4,10 24,10 24,4 36,14 24,24 24,18 4,18" fill={fill} />
      )}
      {kind === "line" && (
        <line x1="4" y1="14" x2="36" y2="14" stroke={fill} strokeWidth="3" />
      )}
      {kind === "roundRect" && (
        <rect x="6" y="5" width="28" height="18" rx="5" fill={fill} />
      )}
      {kind === "hexagon" && (
        <polygon points="12,4 28,4 36,14 28,24 12,24 4,14" fill={fill} />
      )}
      {kind === "pentagon" && (
        <polygon points="20,2 36,12 30,26 10,26 4,12" fill={fill} />
      )}
      {kind === "chevron" && (
        <polygon points="4,6 22,6 34,14 22,22 4,22 12,14" fill={fill} />
      )}
      {kind === "cross" && (
        <polygon
          points="15,2 25,2 25,10 34,10 34,18 25,18 25,26 15,26 15,18 6,18 6,10 15,10"
          fill={fill}
        />
      )}
      {kind === "parallelogram" && (
        <polygon points="10,5 36,5 30,23 4,23" fill={fill} />
      )}
      {kind === "trapezoid" && (
        <polygon points="10,5 30,5 36,23 4,23" fill={fill} />
      )}
      {(kind === "rect" ||
        ![
          "ellipse",
          "triangle",
          "diamond",
          "star",
          "arrow",
          "line",
          "roundRect",
          "hexagon",
          "pentagon",
          "chevron",
          "cross",
          "parallelogram",
          "trapezoid",
        ].includes(kind)) && (
        <rect x="6" y="5" width="28" height="18" fill={fill} />
      )}
    </svg>
  );
}
