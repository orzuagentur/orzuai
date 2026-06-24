"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  COMMON_SCHEDULE_TIMEZONES,
  createEmptyScheduleSlot,
  WEEKDAY_LABELS,
} from "@/lib/ai/agent-schedule";
import { cn } from "@/lib/utils";
import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";

type AiAgentScheduleEditorProps = {
  enabled: boolean;
  timezone: string;
  slots: AgentScheduleSlot[];
  disabled?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTimezoneChange: (timezone: string) => void;
  onSlotsChange: (slots: AgentScheduleSlot[]) => void;
};

function toggleDay(slot: AgentScheduleSlot, day: number): AgentScheduleSlot {
  const hasDay = slot.days.includes(day);

  return {
    ...slot,
    days: hasDay
      ? slot.days.filter((item) => item !== day)
      : [...slot.days, day].sort((left, right) => left - right),
  };
}

export function AiAgentScheduleEditor({
  enabled,
  timezone,
  slots,
  disabled = false,
  onEnabledChange,
  onTimezoneChange,
  onSlotsChange,
}: AiAgentScheduleEditorProps) {
  function updateSlot(index: number, nextSlot: AgentScheduleSlot) {
    onSlotsChange(slots.map((slot, slotIndex) => (slotIndex === index ? nextSlot : slot)));
  }

  function removeSlot(index: number) {
    onSlotsChange(slots.filter((_, slotIndex) => slotIndex !== index));
  }

  function addSlot() {
    onSlotsChange([...slots, createEmptyScheduleSlot()]);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{AI_ASSISTANT_MESSAGES.agentScheduleLabel}</Label>
        <p className="text-xs text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.agentScheduleHint}
        </p>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <span>{AI_ASSISTANT_MESSAGES.agentScheduleEnabledLabel}</span>
        <input
          type="checkbox"
          className="size-4"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
      </label>

      {enabled ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="agent-schedule-timezone">
              {AI_ASSISTANT_MESSAGES.agentScheduleTimezoneLabel}
            </Label>
            <select
              id="agent-schedule-timezone"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={timezone}
              disabled={disabled}
              onChange={(event) => onTimezoneChange(event.target.value)}
            >
              {COMMON_SCHEDULE_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>

          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.agentScheduleEmpty}
            </p>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div key={`${index}-${slot.start}-${slot.end}`} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {AI_ASSISTANT_MESSAGES.agentScheduleSlotLabel} {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={disabled}
                      aria-label={AI_ASSISTANT_MESSAGES.agentScheduleRemoveSlot}
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {WEEKDAY_LABELS.map((label, day) => {
                      const isActive = slot.days.includes(day);

                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={disabled}
                          onClick={() => updateSlot(index, toggleDay(slot, day))}
                          className={cn(
                            "rounded-md border px-2 py-1 text-xs",
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/50",
                            disabled && "opacity-60",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`schedule-start-${index}`}>
                        {AI_ASSISTANT_MESSAGES.agentScheduleStartLabel}
                      </Label>
                      <Input
                        id={`schedule-start-${index}`}
                        type="time"
                        value={slot.start}
                        disabled={disabled}
                        onChange={(event) =>
                          updateSlot(index, { ...slot, start: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`schedule-end-${index}`}>
                        {AI_ASSISTANT_MESSAGES.agentScheduleEndLabel}
                      </Label>
                      <Input
                        id={`schedule-end-${index}`}
                        type="time"
                        value={slot.end}
                        disabled={disabled}
                        onChange={(event) =>
                          updateSlot(index, { ...slot, end: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addSlot}
          >
            <PlusIcon className="size-4" />
            {AI_ASSISTANT_MESSAGES.agentScheduleAddSlot}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
