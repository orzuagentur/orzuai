"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type HoverIconMenuOption = {
  id: string;
  label: string;
};

type HoverIconMenuProps = {
  icon: ReactNode;
  title: string;
  options: HoverIconMenuOption[];
  activeId: string;
  onSelect: (id: string) => void;
  align?: "left" | "right";
  /** Open menu above (top) or below (bottom) the trigger. */
  side?: "top" | "bottom";
  disabled?: boolean;
  className?: string;
};

export function HoverIconMenu({
  icon,
  title,
  options,
  activeId,
  onSelect,
  align = "right",
  side = "bottom",
  disabled = false,
  className,
}: HoverIconMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => {
        if (disabled) return;
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        title={title}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex size-8 items-center justify-center rounded-lg border bg-background/95 text-muted-foreground shadow-sm transition-colors",
          "hover:bg-muted/40 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
          open && "border-foreground/15 bg-muted/40 text-foreground",
        )}
      >
        {icon}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 min-w-[10.5rem] rounded-xl border bg-background p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                onSelect(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                activeId === option.id
                  ? "bg-violet-100 font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
