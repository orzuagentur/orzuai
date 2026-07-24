"use client";

import type { SlideElement } from "@/lib/presentation/types";

const LABELS: Record<SlideElement["type"], string> = {
  text: "Text",
  shape: "Shape",
  image: "Photo",
  video: "Video",
  icon: "Icon",
  emoji: "Emoji",
  qr: "QR code",
  chart: "Diagram",
};

function preview(el: SlideElement): string {
  switch (el.type) {
    case "text":
      return el.text.slice(0, 48) || "Empty text";
    case "image":
      return el.alt || el.credit || "Photo";
    case "icon":
      return el.iconId;
    case "emoji":
      return el.label || el.emoji;
    case "qr":
      return el.data.slice(0, 40);
    case "chart":
      return `${el.chart} · ${el.title}`;
    case "shape":
      return el.shape;
    case "video":
      return el.credit || "Video";
  }
}

export function SlideResourcesPanel({
  slideIndex,
  slideName,
  elements,
  onSelect,
}: {
  slideIndex: number;
  slideName: string;
  elements: SlideElement[];
  onSelect: (id: string) => void;
}) {
  const counts = elements.reduce(
    (acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<SlideElement["type"], number>>,
  );

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--fg)]">
          Slide {slideIndex + 1} · {slideName}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Everything used on this page. Tap a card to select it and open
          settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            "text",
            "image",
            "emoji",
            "icon",
            "qr",
            "chart",
            "shape",
          ] as const
        ).map((type) => {
          const n = counts[type] || 0;
          if (!n) return null;
          return (
            <div
              key={type}
              className="rounded-lg border border-[var(--line)] bg-white/[0.03] px-2.5 py-2"
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {LABELS[type]}
              </div>
              <div className="text-lg font-semibold text-[var(--fg)]">{n}</div>
            </div>
          );
        })}
      </div>

      {!sorted.length && (
        <p className="text-xs text-[var(--muted)]">
          No objects on this slide yet. Add text, photos, icons…
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          On this slide
        </p>
        {sorted.map((el, i) => (
          <button
            key={el.id}
            type="button"
            onClick={() => onSelect(el.id)}
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--line)] px-2.5 py-2 text-left transition hover:border-[var(--accent)] hover:bg-white/[0.04]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30 text-[10px] font-medium text-[var(--muted)]">
              {el.type === "image" || el.type === "qr" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={el.src} alt="" className="h-full w-full object-cover" />
              ) : el.type === "emoji" && el.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={el.src} alt="" className="h-5 w-5 object-contain" />
              ) : el.type === "icon" ? (
                <span
                  className="block h-4 w-4"
                  style={{
                    backgroundColor: el.color || "#fff",
                    WebkitMask: `url(${el.svgUrl}) center / contain no-repeat`,
                    mask: `url(${el.svgUrl}) center / contain no-repeat`,
                  }}
                />
              ) : (
                LABELS[el.type].slice(0, 2)
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] text-[var(--muted)]">
                #{i + 1} · {LABELS[el.type]}
              </span>
              <span className="block truncate text-xs text-[var(--fg)]">
                {preview(el)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
