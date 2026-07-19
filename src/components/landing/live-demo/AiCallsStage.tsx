"use client";

import {
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneOffIcon,
  PlayIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { useDemoSpeechPlayback } from "@/components/landing/live-demo/hooks";
import { VoiceMonitorWaveform } from "@/components/voice/workspace/VoiceMonitorWaveform";
import type { LandingLiveEvent } from "@/features/landing/demo";
import { cn } from "@/lib/utils";

type AiCallsStageProps = {
  event: LandingLiveEvent;
};

export function AiCallsStage({ event }: AiCallsStageProps) {
  const { copy, locale } = useLandingLocale();
  const turns = event.callTurns ?? [];
  const { playing, turnIndex, toggle, stop } = useDemoSpeechPlayback(turns, locale);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node || turnIndex < 0) return;
    node.scrollTop = node.scrollHeight;
  }, [turnIndex]);

  function handleEnd() {
    stop();
    setMuted(false);
    setOnHold(false);
  }

  const activeListening = playing && !muted && !onHold;

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {copy.liveDemo.calls}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-zinc-900">{event.customer}</h2>
            <p className="mt-1 text-xs text-zinc-500">{event.preview}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200/80">
            <span
              className={cn(
                "size-1.5 rounded-full",
                activeListening ? "bg-zinc-800" : "bg-zinc-400",
              )}
            />
            {activeListening
              ? copy.liveDemo.callListening
              : onHold
                ? copy.liveDemo.callHold
                : event.callStatus}
          </div>
        </div>

        <div className="mt-4">
          <VoiceMonitorWaveform active={activeListening} className="h-16 rounded-xl bg-zinc-50" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={onHold}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition",
              playing
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              onHold && "opacity-50",
            )}
          >
            {playing ? (
              <HeadphonesIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <PlayIcon className="size-3.5" aria-hidden="true" />
            )}
            {playing ? copy.liveDemo.stopListen : copy.liveDemo.listenLive}
          </button>

          <button
            type="button"
            onClick={() => {
              setMuted((value) => {
                const next = !value;
                if (next) stop();
                return next;
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            {muted ? (
              <MicOffIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <MicIcon className="size-3.5" aria-hidden="true" />
            )}
            {muted ? copy.liveDemo.unmute : copy.liveDemo.mute}
          </button>

          <button
            type="button"
            onClick={() => {
              setOnHold((value) => {
                const next = !value;
                if (next) stop();
                return next;
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            {onHold ? (
              <PlayIcon className="size-3.5" aria-hidden="true" />
            ) : (
              <PauseIcon className="size-3.5" aria-hidden="true" />
            )}
            {onHold ? copy.liveDemo.resume : copy.liveDemo.callHold}
          </button>

          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <UserIcon className="size-3.5" aria-hidden="true" />
            {copy.liveDemo.takeOver}
          </button>

          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
          >
            <PhoneOffIcon className="size-3.5" aria-hidden="true" />
            {copy.liveDemo.endCall}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {copy.liveDemo.liveTranscript}
        </p>
        <div
          ref={transcriptRef}
          className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3"
        >
          {turns.map((turn, index) => {
            const revealed = turnIndex < 0 ? false : index <= turnIndex;
            const active = turnIndex === index;

            return (
              <div
                key={`${turn.speaker}-${index}`}
                className={cn(
                  "rounded-lg border px-3 py-2 transition",
                  !revealed && "opacity-30",
                  active && "border-zinc-300 bg-white shadow-sm",
                  revealed && !active && "border-zinc-100 bg-white/80",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {turn.speaker === "ai" ? "AI Agent" : "Customer"}
                </p>
                <p className="mt-0.5 text-sm leading-5 text-zinc-700">{turn.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
