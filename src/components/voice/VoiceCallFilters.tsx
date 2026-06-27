"use client";

import { Button } from "@/components/ui/button";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallFilter } from "@/utils/voice-call-display";

const FILTERS: { id: VoiceCallFilter; label: string }[] = [
  { id: "all", label: VOICE_MESSAGES.callFilterAll },
  { id: "inbound", label: VOICE_MESSAGES.callFilterInbound },
  { id: "outbound", label: VOICE_MESSAGES.callFilterOutbound },
  { id: "missed", label: VOICE_MESSAGES.callFilterMissed },
];

type VoiceCallFiltersProps = {
  value: VoiceCallFilter;
  onChange: (value: VoiceCallFilter) => void;
  className?: string;
};

export function VoiceCallFilters({
  value,
  onChange,
  className,
}: VoiceCallFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-1 px-4 pb-3", className)}>
      {FILTERS.map((filter) => (
        <Button
          key={filter.id}
          type="button"
          size="sm"
          variant={value === filter.id ? "secondary" : "ghost"}
          className="h-8"
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
