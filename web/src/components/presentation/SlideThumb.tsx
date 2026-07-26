"use client";

import type { PresentationSlide } from "@/lib/presentation/types";
import { slideSurfaceStyle } from "@/lib/presentation/surface";
import { PresentationElementView } from "./PresentationElementView";

/** Mini live preview of a slide for the filmstrip */
export function SlideThumb({
  slide,
  active,
  index,
  onClick,
}: {
  slide: PresentationSlide;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-video w-full overflow-hidden rounded-md border text-left transition ${
        active
          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
          : "border-[var(--line)] hover:border-white/25"
      }`}
      style={slideSurfaceStyle(slide)}
      title={slide.name}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ containerType: "inline-size" }}
      >
        {slide.elements
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
      </div>
      <span className="absolute left-1 top-1 rounded bg-black/55 px-1 text-[9px] text-white/85">
        {index + 1}
      </span>
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5 pt-3 text-[9px] text-white/80">
        {slide.name}
      </span>
    </button>
  );
}
