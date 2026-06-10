"use client";

import { cn } from "@/lib/utils";

type AutomationOnOffControlProps = {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
};

export function AutomationOnOffControl({
  enabled,
  disabled = false,
  onChange,
  className,
}: AutomationOnOffControlProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-md border bg-background p-0.5",
        disabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "min-w-[3.25rem] rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
          !enabled
            ? "bg-neutral-900 text-white"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Off
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "min-w-[3.25rem] rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
          enabled
            ? "bg-emerald-500 text-white"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        On
      </button>
    </div>
  );
}
