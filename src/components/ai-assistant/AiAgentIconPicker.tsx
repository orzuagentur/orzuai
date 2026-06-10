"use client";

import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  AGENT_ICONS,
  type AgentIconId,
} from "@/features/ai-assistant/agent-icons";
import { cn } from "@/lib/utils";

type AiAgentIconPickerProps = {
  value: AgentIconId;
  disabled?: boolean;
  onChange: (value: AgentIconId) => void;
};

export function AiAgentIconPicker({
  value,
  disabled = false,
  onChange,
}: AiAgentIconPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{AI_ASSISTANT_MESSAGES.agentIconLabel}</Label>
      <p className="text-caption text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.agentIconHint}
      </p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {AGENT_ICONS.map((entry) => {
          const Icon = entry.icon;
          const isSelected = value === entry.id;

          return (
            <button
              key={entry.id}
              type="button"
              disabled={disabled}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={isSelected}
              onClick={() => onChange(entry.id)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1.5 transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
                disabled && "opacity-60",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="line-clamp-1 w-full text-center text-[9px] font-medium leading-none">
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
