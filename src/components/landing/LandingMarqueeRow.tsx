"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type LandingMarqueeRowProps = {
  children: ReactNode;
  direction?: "left" | "right";
  /** Pixels per second. */
  speed?: number;
  className?: string;
};

/**
 * Seamless infinite marquee — auto-only (no drag / no pause).
 * Parent must pass duplicated children (2x or 3x) so loopWidth is half/third of track.
 */
export function LandingMarqueeRow({
  children,
  direction = "left",
  speed = 28,
  className,
}: LandingMarqueeRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    let last = performance.now();
    const sign = direction === "left" ? 1 : -1;

    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 1000;
      last = now;

      // Content is tripled — one segment is 1/3 of scrollWidth.
      const loopWidth = track.scrollWidth / 3;
      if (loopWidth > 8) {
        offsetRef.current += sign * speed * dt;
        while (offsetRef.current >= loopWidth) offsetRef.current -= loopWidth;
        while (offsetRef.current < 0) offsetRef.current += loopWidth;
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [direction, speed]);

  return (
    <div className={cn("overflow-hidden", className)} aria-hidden="true">
      <div
        ref={trackRef}
        className="flex w-max gap-2 will-change-transform sm:gap-3"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function LandingMarqueeCardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[min(72vw,280px)] shrink-0 sm:w-[min(42vw,320px)] lg:w-[min(30vw,340px)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
