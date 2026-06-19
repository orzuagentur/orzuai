"use client";

import { useState } from "react";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

const COLLAPSED_CHAR_LIMIT = 320;

type ExpandableMessageTextProps = {
  text: string;
  className?: string;
  mutedActionClassName?: string;
};

export function ExpandableMessageText({
  text,
  className,
  mutedActionClassName,
}: ExpandableMessageTextProps) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = text.length > COLLAPSED_CHAR_LIMIT;
  const displayText =
    !needsCollapse || expanded
      ? text
      : `${text.slice(0, COLLAPSED_CHAR_LIMIT).trimEnd()}…`;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
        {displayText}
      </p>
      {needsCollapse ? (
        <button
          type="button"
          className={cn(
            "mt-1 text-xs font-medium underline-offset-2 hover:underline",
            mutedActionClassName,
          )}
          onClick={() => {
            setExpanded((current) => !current);
          }}
        >
          {expanded ? CHAT_MESSAGES.showLessText : CHAT_MESSAGES.showMoreText}
        </button>
      ) : null}
    </div>
  );
}
