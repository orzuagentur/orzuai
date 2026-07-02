"use client";

import { useEffect, useRef } from "react";
import { SparklesIcon, UserIcon } from "lucide-react";

import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";

type VoiceLiveTranscriptPanelProps = {
  turns: VoiceCallSessionTurn[];
  isLive?: boolean;
  className?: string;
};

export function VoiceLiveTranscriptPanel({
  turns,
  isLive = false,
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
        {turns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {VOICE_MESSAGES.callNoTranscript}
          </p>
        ) : (
          <div className="space-y-3">
            {turns.map((turn, index) => (
              <article
                key={`${turn.role}-${index}-${turn.content.slice(0, 24)}`}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm shadow-sm",
                  turn.role === "assistant"
                    ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30"
                    : "border-border bg-muted/30",
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {turn.role === "assistant" ? (
                    <SparklesIcon className="size-3.5 text-indigo-600" />
                  ) : (
                    <UserIcon className="size-3.5" />
                  )}
                  {turn.role === "assistant"
                    ? VOICE_MESSAGES.callTranscriptAssistant
                    : VOICE_MESSAGES.callTranscriptUser}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
                  {turn.content}
                </p>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
