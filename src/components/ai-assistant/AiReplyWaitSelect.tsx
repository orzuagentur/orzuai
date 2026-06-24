"use client";

import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  formatReplyWaitLabel,
  REPLY_WAIT_MS_OPTIONS,
} from "@/lib/ai/languages";
import { cn } from "@/lib/utils";

type AiReplyWaitSelectProps = {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function AiReplyWaitSelect({
  value,
  disabled = false,
  onChange,
}: AiReplyWaitSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{AI_ASSISTANT_MESSAGES.replyWaitLabel}</Label>
      <p className="text-xs text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.replyWaitHint}
      </p>
      <div className="flex flex-wrap gap-2">
        {REPLY_WAIT_MS_OPTIONS.map((waitMs) => {
          const isSelected = value === waitMs;

          return (
            <button
              key={waitMs}
              type="button"
              disabled={disabled}
              onClick={() => onChange(waitMs)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
                disabled && "opacity-60",
              )}
            >
              {formatReplyWaitLabel(waitMs)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
