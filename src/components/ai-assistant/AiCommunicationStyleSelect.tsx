"use client";

import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  COMMUNICATION_STYLES,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import { cn } from "@/lib/utils";

type AiCommunicationStyleSelectProps = {
  value: CommunicationStyleId;
  disabled?: boolean;
  onChange: (value: CommunicationStyleId) => void;
};

export function AiCommunicationStyleSelect({
  value,
  disabled = false,
  onChange,
}: AiCommunicationStyleSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{AI_ASSISTANT_MESSAGES.communicationStyleLabel}</Label>
      <p className="text-caption text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.communicationStyleHint}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {COMMUNICATION_STYLES.map((style) => {
          const isSelected = value === style.id;

          return (
            <button
              key={style.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(style.id)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
                disabled && "opacity-60",
              )}
            >
              <p className="text-sm font-medium">{style.label}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {style.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
