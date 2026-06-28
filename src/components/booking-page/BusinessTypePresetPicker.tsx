"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  BUSINESS_TYPE_PRESET_LIST,
  getBusinessTypePreset,
} from "@/lib/calendar/business-type-presets";
import { BUSINESS_TYPE_ICONS } from "@/lib/calendar/business-type-icons";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { BusinessBookingType } from "@/types/business-calendar-resource.types";

type BusinessTypePresetPickerProps = {
  value: BusinessBookingType;
  onChange: (type: BusinessBookingType) => void;
  onApplyPreset: (type: BusinessBookingType) => void;
  onManualApplyPreset?: () => void;
  className?: string;
};

export function BusinessTypePresetPicker({
  value,
  onChange,
  onApplyPreset,
  onManualApplyPreset,
  className,
}: BusinessTypePresetPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const selected = getBusinessTypePreset(value);
  const SelectedIcon = BUSINESS_TYPE_ICONS[value];

  function selectType(type: BusinessBookingType) {
    onChange(type);
    onApplyPreset(type);
    setExpanded(false);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.businessTypeLabel}</p>
        <p className="text-xs text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.businessTypeHint}
        </p>
      </div>

      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <SelectedIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{selected.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {selected.description}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border bg-card p-2">
          <div className="grid gap-1.5">
            {BUSINESS_TYPE_PRESET_LIST.map((preset) => {
              const Icon = BUSINESS_TYPE_ICONS[preset.type];
              const isActive = preset.type === value;

              return (
                <button
                  key={preset.type}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "hover:bg-muted/60",
                  )}
                  onClick={() => selectType(preset.type)}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{preset.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {preset.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="text-xs font-medium text-primary hover:underline"
        onClick={() => (onManualApplyPreset ? onManualApplyPreset() : onApplyPreset(value))}
      >
        {ORZUX_CALENDAR_MESSAGES.applyPreset}
      </button>
    </div>
  );
}
