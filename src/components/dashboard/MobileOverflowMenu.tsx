"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3Icon,
  BotIcon,
  ClipboardListIcon,
  MoreVerticalIcon,
  PlugIcon,
  XIcon,
} from "lucide-react";

import { AiAssistantIcon } from "@/components/icons/AiAssistantIcon";
import { Button } from "@/components/ui/button";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "orzu-mobile-overflow-pos";

const MOBILE_OVERFLOW_LINKS = [
  {
    href: DASHBOARD_ROUTES.orders,
    label: "Orders",
    icon: ClipboardListIcon,
  },
  {
    href: DASHBOARD_ROUTES.analytics,
    label: "Analytics",
    icon: BarChart3Icon,
  },
  {
    href: DASHBOARD_ROUTES.integrations,
    label: "Integrations",
    icon: PlugIcon,
  },
  {
    href: DASHBOARD_ROUTES.aiAssistant,
    label: "AI Agent",
    icon: BotIcon,
  },
] as const;

type Position = { x: number; y: number };

const BUTTON_SIZE = 44;
const DEFAULT_POS: Position = { x: 12, y: 0 };

function clampPosition(pos: Position): Position {
  if (typeof window === "undefined") {
    return pos;
  }

  const maxX = Math.max(8, window.innerWidth - BUTTON_SIZE - 8);
  const maxY = Math.max(
    8,
    window.innerHeight - BUTTON_SIZE - 72 - 8,
  );

  return {
    x: Math.min(maxX, Math.max(8, pos.x)),
    y: Math.min(maxY, Math.max(8, pos.y)),
  };
}

function readStoredPosition(): Position {
  if (typeof window === "undefined") {
    return DEFAULT_POS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        x: 12,
        y: Math.round(window.innerHeight / 2 - BUTTON_SIZE / 2),
      };
    }
    const parsed = JSON.parse(raw) as Position;
    return clampPosition(parsed);
  } catch {
    return {
      x: 12,
      y: Math.round(window.innerHeight / 2 - BUTTON_SIZE / 2),
    };
  }
}

/**
 * Mobile-only draggable ⋮ FAB with a floating card:
 * Orders, Analytics, Integrations, AI Agent, OrzuAI.
 */
export function MobileOverflowMenu() {
  const pathname = usePathname();
  const { setIsOpen: setCopilotOpen } = usePlatformCopilot();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>(DEFAULT_POS);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    setPosition(readStoredPosition());

    function onResize() {
      setPosition((current) => clampPosition(current));
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persistPosition = useCallback((next: Position) => {
    const clamped = clampPosition(next);
    setPosition(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      // ignore
    }
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) < 6) {
      return;
    }

    drag.moved = true;
    setPosition(
      clampPosition({
        x: drag.originX + dx,
        y: drag.originY + dy,
      }),
    );
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (drag.moved) {
      justDraggedRef.current = true;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      persistPosition({
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 80);
    }

    dragRef.current = null;
  }

  function handleFabClick() {
    if (justDraggedRef.current) {
      return;
    }
    setOpen((value) => !value);
  }

  const openAbove = position.y > 240;
  const cardStyle: React.CSSProperties = {
    left: Math.min(
      position.x,
      typeof window !== "undefined"
        ? Math.max(8, window.innerWidth - 220)
        : position.x,
    ),
    top: openAbove ? position.y - 8 : position.y + BUTTON_SIZE + 8,
    transform: openAbove ? "translateY(-100%)" : undefined,
  };

  return (
    <div className="md:hidden">
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50 w-[200px] overflow-hidden rounded-2xl border bg-background/98 shadow-2xl backdrop-blur"
            style={cardStyle}
            role="dialog"
            aria-label="Quick menu"
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-semibold">Menu</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
            <nav className="p-1.5">
              <ul className="space-y-0.5">
                {MOBILE_OVERFLOW_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
                    onClick={() => {
                      setOpen(false);
                      setCopilotOpen(true);
                    }}
                  >
                    <AiAssistantIcon size={16} className="size-4 shrink-0" />
                    {PLATFORM_COPILOT_MESSAGES.name}
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          "fixed z-40 size-11 touch-none rounded-full border shadow-lg",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85",
          "active:cursor-grabbing",
        )}
        style={{ left: position.x, top: position.y }}
        aria-label="More menu"
        aria-expanded={open}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleFabClick}
      >
        <MoreVerticalIcon className="size-5" />
      </Button>
    </div>
  );
}
