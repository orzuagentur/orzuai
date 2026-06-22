"use client";

import { cn } from "@/lib/utils";
import { getChatTypingBubbleClassName } from "@/features/chats/chat-theme";

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
      <div className={getChatTypingBubbleClassName(variant)}>
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
