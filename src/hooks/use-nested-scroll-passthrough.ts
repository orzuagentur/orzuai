"use client";

import { useEffect, type RefObject } from "react";

/**
 * When the cursor is over a nested scroll panel:
 * - if the panel still has room in the wheel direction, scroll the panel
 * - once it hits the edge (or has nothing to scroll), the page scrolls
 */
export function useNestedScrollPassthrough(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      const canScroll = maxScroll > 1;
      const delta = event.deltaY;

      if (!canScroll) {
        return;
      }

      const atTop = scrollTop <= 0.5;
      const atBottom = scrollTop >= maxScroll - 0.5;
      const scrollingDown = delta > 0;
      const scrollingUp = delta < 0;

      const shouldScrollPanel =
        (scrollingDown && !atBottom) || (scrollingUp && !atTop);

      if (shouldScrollPanel) {
        event.preventDefault();
        el.scrollTop += delta;
        return;
      }

      event.preventDefault();
      window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, ref]);
}
