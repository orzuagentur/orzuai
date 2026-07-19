"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Star = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  life: number;
};

/** Small sparkle stars that follow the cursor on the welcome page. */
export function LandingCursorAura() {
  const reducedMotion = useReducedMotion();
  const [stars, setStars] = useState<Star[]>([]);
  const starId = useRef(0);
  const lastSpawn = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;

    function onMove(event: PointerEvent) {
      const now = performance.now();
      if (now - lastSpawn.current > 42) {
        lastSpawn.current = now;
        starId.current += 1;
        const id = starId.current;
        const star: Star = {
          id,
          x: event.clientX,
          y: event.clientY,
          size: 3 + Math.random() * 5,
          opacity: 0.35 + Math.random() * 0.55,
          life: 700 + Math.random() * 500,
        };
        setStars((current) => [...current.slice(-18), star]);
        window.setTimeout(() => {
          setStars((current) => current.filter((item) => item.id !== id));
        }, star.life);
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[25] overflow-hidden"
      aria-hidden="true"
    >
      {stars.map((star) => (
        <span
          key={star.id}
          className="landing-cursor-star"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDuration: `${star.life}ms`,
          }}
        />
      ))}
    </div>
  );
}
