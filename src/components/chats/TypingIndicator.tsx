"use client";

import { cn } from "@/lib/utils";

type TypingIndicatorProps = {
  label: string;
  className?: string;
  variant?: "incoming" | "outgoing";
};

export function TypingIndicator({
  label,
  className,
  variant = "incoming",
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full",
        variant === "outgoing" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex max-w-[min(85%,20rem)] items-center gap-2 rounded-lg px-3 py-2 text-xs shadow-sm",
          variant === "outgoing"
            ? "rounded-br-sm bg-emerald-600 text-emerald-50"
            : "rounded-bl-sm border bg-card text-muted-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
