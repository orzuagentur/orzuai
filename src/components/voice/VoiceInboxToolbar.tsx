"use client";

import { Grid3x3Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";

type VoiceInboxToolbarProps = {
  showDialpadToggle: boolean;
  dialpadOpen: boolean;
  onOpenDialpad: () => void;
  className?: string;
};

export function VoiceInboxToolbar({
  showDialpadToggle,
  dialpadOpen,
  onOpenDialpad,
  className,
}: VoiceInboxToolbarProps) {
  if (!showDialpadToggle) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        size="icon"
        variant={dialpadOpen ? "default" : "outline"}
        className="size-8 shrink-0"
        onClick={onOpenDialpad}
        aria-label={VOICE_MESSAGES.dialpadTitle}
      >
        <Grid3x3Icon className="size-4" />
      </Button>
    </div>
  );
}
