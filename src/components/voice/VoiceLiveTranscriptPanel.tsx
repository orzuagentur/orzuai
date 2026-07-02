"use client";

import { useEffect, useRef } from "react";

import { VoiceTranscriptTurns } from "@/components/voice/VoiceTranscriptTurns";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";

type VoiceLiveTranscriptPanelProps = {
  turns: VoiceCallSessionTurn[];
  isLive?: boolean;
  callTiming?: { createdAt: string; endedAt: string | null };
  className?: string;
};

export function VoiceLiveTranscriptPanel({
  turns,
  isLive = false,
  callTiming = { createdAt: new Date().toISOString(), endedAt: null },
  className,
}: VoiceLiveTranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLive || turns.length === 0) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isLive, turns]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {isLive
              ? VOICE_MESSAGES.callTranscriptLive
              : VOICE_MESSAGES.callDetailTitle}
          </h3>
          {isLive ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
          ) : null}
        </div>
        {turns.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {turns.length} {turns.length === 1 ? "turn" : "turns"}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <VoiceTranscriptTurns turns={turns} callTiming={callTiming} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
