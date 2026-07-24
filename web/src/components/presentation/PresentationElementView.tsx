"use client";

import type { CSSProperties } from "react";
import type { ResizeHandle, SlideElement } from "@/lib/presentation/types";
import { PresentationChart } from "./PresentationChart";

const ANIM_CLASS: Record<string, string> = {
  none: "",
  fadeIn: "pres-anim-fade-in",
  fadeUp: "pres-anim-fade-up",
  fadeDown: "pres-anim-fade-down",
  zoomIn: "pres-anim-zoom-in",
  slideLeft: "pres-anim-slide-left",
  slideRight: "pres-anim-slide-right",
  bounce: "pres-anim-bounce",
};

const HANDLES: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: "nw", className: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
  { id: "n", className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { id: "ne", className: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
  { id: "e", className: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { id: "se", className: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
  { id: "s", className: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "ns-resize" },
  { id: "sw", className: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
  { id: "w", className: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

export function PresentationElementView({
  el,
  selected,
  playing,
  interactive = true,
  editing,
  onSelect,
  onPointerDown,
  onDoubleClick,
  onChangeText,
  onEndEdit,
}: {
  el: SlideElement;
  selected: boolean;
  playing?: boolean;
  interactive?: boolean;
  editing?: boolean;
  onSelect?: (id: string) => void;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onDoubleClick?: (id: string) => void;
  onChangeText?: (id: string, text: string) => void;
  onEndEdit?: () => void;
}) {
  const style: CSSProperties = {
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    transform: `rotate(${el.rotation}deg)`,
    zIndex: el.zIndex + (editing ? 50 : 0),
    ["--pres-anim-delay" as string]: `${el.animationDelay}ms`,
    ["--pres-anim-duration" as string]: `${el.animationDuration}ms`,
    pointerEvents: interactive ? "auto" : "none",
  };

  const animClass =
    playing && el.animation !== "none" ? ANIM_CLASS[el.animation] : "";

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-el-id={el.id}
      className={`absolute outline-none ${editing ? "" : "select-none"} ${animClass} ${
        interactive && selected
          ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-transparent"
          : interactive
            ? "hover:ring-1 hover:ring-white/25"
            : ""
      }`}
      style={style}
      onPointerDown={
        interactive && onPointerDown && !editing
          ? (e) => onPointerDown(e, el.id)
          : undefined
      }
      onClick={
        interactive && onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(el.id);
            }
          : undefined
      }
      onDoubleClick={
        interactive && onDoubleClick
          ? (e) => {
              e.stopPropagation();
              onDoubleClick(el.id);
            }
          : undefined
      }
    >
      {el.type === "text" &&
        (editing ? (
          <textarea
            autoFocus
            className="h-full w-full resize-none bg-transparent px-1 outline-none"
            style={{
              color: el.color,
              fontSize: `clamp(8px, ${el.fontSize * 0.085}cqw, ${el.fontSize}px)`,
              fontWeight: el.fontWeight,
              textAlign: el.align,
              fontFamily: el.fontFamily,
              lineHeight: el.lineHeight ?? 1.25,
              fontStyle: el.italic ? "italic" : undefined,
              textDecoration: el.underline ? "underline" : undefined,
            }}
            value={el.text}
            onChange={(e) => onChangeText?.(el.id, e.target.value)}
            onBlur={() => onEndEdit?.()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") onEndEdit?.();
              e.stopPropagation();
            }}
          />
        ) : (
          <div
            className="h-full w-full overflow-hidden whitespace-pre-wrap break-words px-1"
            style={{
              color: el.color,
              fontSize: `clamp(8px, ${el.fontSize * 0.085}cqw, ${el.fontSize}px)`,
              fontWeight: el.fontWeight,
              textAlign: el.align,
              fontFamily: el.fontFamily,
              lineHeight: el.lineHeight ?? 1.25,
              letterSpacing: el.letterSpacing
                ? `${el.letterSpacing}px`
                : undefined,
              fontStyle: el.italic ? "italic" : undefined,
              textDecoration: el.underline ? "underline" : undefined,
            }}
          >
            {el.text}
          </div>
        ))}

      {el.type === "shape" && <ShapeSvg el={el} />}

      {el.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={el.src}
          alt={el.alt}
          className="pointer-events-none h-full w-full"
          style={{ objectFit: el.objectFit }}
          draggable={false}
        />
      )}

      {el.type === "video" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={el.poster || el.src}
          alt=""
          className="pointer-events-none h-full w-full object-cover opacity-80"
          draggable={false}
        />
      )}

      {el.type === "icon" && (
        <div
          className="pointer-events-none h-full w-full"
          style={{
            backgroundColor: el.color || "#ffffff",
            WebkitMask: `url(${el.svgUrl}) center / contain no-repeat`,
            mask: `url(${el.svgUrl}) center / contain no-repeat`,
          }}
          title={el.iconId}
        />
      )}

      {el.type === "emoji" &&
        (el.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={el.src}
            alt={el.label || el.emoji}
            className="pointer-events-none h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center leading-none"
            style={{ fontSize: "clamp(16px, 8cqw, 72px)" }}
          >
            {el.emoji}
          </div>
        ))}

      {el.type === "qr" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={el.src}
          alt={el.data}
          className="pointer-events-none h-full w-full object-contain bg-white"
          draggable={false}
        />
      )}

      {el.type === "chart" && (
        <div className="h-full w-full overflow-hidden rounded-md bg-black/10 text-inherit">
          <PresentationChart el={el} />
        </div>
      )}

      {interactive && selected && !playing &&
        HANDLES.map((h) => (
          <span
            key={h.id}
            data-resize={h.id}
            className={`absolute h-3 w-3 rounded-sm border border-black/50 bg-[var(--accent)] ${h.className}`}
            style={{ cursor: h.cursor }}
          />
        ))}
    </div>
  );
}

function ShapeSvg({ el }: { el: Extract<SlideElement, { type: "shape" }> }) {
  const common = {
    fill: el.fill,
    stroke: el.stroke === "transparent" ? "none" : el.stroke,
    strokeWidth: el.strokeWidth,
    opacity: el.opacity,
  };

  switch (el.shape) {
    case "ellipse":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <ellipse cx="50" cy="50" rx="48" ry="48" {...common} />
        </svg>
      );
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="50,6 94,94 6,94" {...common} />
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <line
            x1="4"
            y1="50"
            x2="96"
            y2="50"
            stroke={el.fill}
            strokeWidth={Math.max(2, el.strokeWidth || 4)}
            opacity={el.opacity}
          />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon
            points="4,35 62,35 62,18 96,50 62,82 62,65 4,65"
            {...common}
          />
        </svg>
      );
    case "roundRect":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <rect x="4" y="8" width="92" height="84" rx="14" {...common} />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon
            points="50,4 61,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 39,38"
            {...common}
          />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="50,4 96,50 50,96 4,50" {...common} />
        </svg>
      );
    case "hexagon":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="28,8 72,8 96,50 72,92 28,92 4,50" {...common} />
        </svg>
      );
    case "pentagon":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="50,4 95,38 77,92 23,92 5,38" {...common} />
        </svg>
      );
    case "chevron":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="4,20 62,20 96,50 62,80 4,80 30,50" {...common} />
        </svg>
      );
    case "cross":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon
            points="35,4 65,4 65,35 96,35 96,65 65,65 65,96 35,96 35,65 4,65 4,35 35,35"
            {...common}
          />
        </svg>
      );
    case "parallelogram":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="22,12 96,12 78,88 4,88" {...common} />
        </svg>
      );
    case "trapezoid":
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <polygon points="22,14 78,14 96,86 4,86" {...common} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <rect x="4" y="8" width="92" height="84" {...common} />
        </svg>
      );
  }
}
