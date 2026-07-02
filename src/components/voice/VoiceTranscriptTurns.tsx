"use client";

import { useEffect, useState } from "react";
import { SparklesIcon, UserIcon } from "lucide-react";

import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";
import {
  formatVoiceCallDateParts,
  resolveVoiceTurnTimestamp,
} from "@/utils/voice-call-display";

type VoiceTranscriptTurnsProps = {
  turns: VoiceCallSessionTurn[];
  callTiming: { createdAt: string; endedAt: string | null };
  className?: string;
};

export function VoiceTranscriptTurns({
  turns,
  callTiming,
  className,
}: VoiceTranscriptTurnsProps) {
  const [useLocalTime, setUseLocalTime] = useState(false);

  useEffect(() => {
    setUseLocalTime(true);
  }, []);

  if (turns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{VOICE_MESSAGES.callNoTranscript}</p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {turns.map((turn, index) => {
        const timestamp = resolveVoiceTurnTimestamp(
          turn,
          callTiming,
          index,
          turns.length,
        );
        const { dateLabel, timeLabel, fullLabel } = formatVoiceCallDateParts(
          timestamp,
          { local: useLocalTime },
        );

        return (
          <article
            key={`${turn.role}-${index}-${turn.content.slice(0, 24)}`}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              turn.role === "assistant"
                ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30"
                : "bg-muted/30",
            )}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {turn.role === "assistant" ? (
                  <SparklesIcon className="size-3.5 text-indigo-600" />
                ) : (
                  <UserIcon className="size-3.5" />
                )}
                {turn.role === "assistant"
                  ? VOICE_MESSAGES.callTranscriptAssistant
                  : VOICE_MESSAGES.callTranscriptUser}
              </div>
              <time
                className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                dateTime={timestamp}
                title={fullLabel}
              >
                {dateLabel} {timeLabel}
              </time>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
              {turn.content}
            </p>
          </article>
        );
      })}
    </div>
  );
}
