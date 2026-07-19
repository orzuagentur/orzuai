"use client";

import {
  HeadphonesIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneIcon,
  PhoneOffIcon,
  PlayIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { useDemoSpeechPlayback } from "@/components/landing/live-demo/hooks";
import {
  LANDING_FAKE_CALL_NUMBER,
  useLiveDemoRealtimeCall,
} from "@/components/landing/live-demo/use-live-demo-realtime-call";
import { VoiceMonitorWaveform } from "@/components/voice/workspace/VoiceMonitorWaveform";
import { useNestedScrollPassthrough } from "@/hooks/use-nested-scroll-passthrough";
import type { LandingLiveEvent } from "@/features/landing/demo";
import { cn } from "@/lib/utils";

type AiCallsStageProps = {
  event: LandingLiveEvent;
  compact?: boolean;
  onUserInteract?: () => void;
};

export function AiCallsStage({
  event,
  compact = false,
  onUserInteract,
}: AiCallsStageProps) {
  const { copy, locale } = useLandingLocale();
  const demoTurns = event.callTurns ?? [];
  const { playing, turnIndex, toggle, stop } = useDemoSpeechPlayback(demoTurns, locale);
  const liveCall = useLiveDemoRealtimeCall(locale);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(transcriptRef);

  const liveMode = liveCall.active;
  const displayTurns = liveMode
    ? liveCall.turns.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text,
        id: turn.id,
        revealed: true,
        active: false,
      }))
    : demoTurns.map((turn, index) => ({
        speaker: turn.speaker,
        text: turn.text,
        id: `${turn.speaker}-${index}`,
        revealed: turnIndex < 0 ? false : index <= turnIndex,
        active: turnIndex === index,
      }));

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [displayTurns.length, turnIndex, liveCall.turns.length]);

  function handleStartLiveCall() {
    onUserInteract?.();
    stop();
    setMuted(false);
    setOnHold(false);
    liveCall.startCall();
  }

  function handleEnd() {
    liveCall.endCall();
    stop();
    setMuted(false);
    setOnHold(false);
  }

  function handleToggleDemo() {
    if (liveMode) return;
    toggle();
  }

  const waveformActive =
    liveMode
      ? liveCall.listening || liveCall.speaking
      : playing && !muted && !onHold;

  const statusLabel = liveMode
    ? liveCall.speaking
      ? copy.liveDemo.callAiSpeaking
      : liveCall.listening
        ? copy.liveDemo.callYourTurn
        : copy.liveDemo.callLive
    : playing && !muted && !onHold
      ? copy.liveDemo.callListening
      : onHold
        ? copy.liveDemo.callHold
        : event.callStatus;

  const errorLabel =
    liveCall.error === "mic"
      ? copy.liveDemo.callMicDenied
      : liveCall.error === "unsupported"
        ? copy.liveDemo.callUnsupported
        : null;

  if (compact) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-white">
        <div className="shrink-0 border-b border-zinc-100 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium tabular-nums text-zinc-500">
                {LANDING_FAKE_CALL_NUMBER}
              </p>
              <p className="truncate text-[10px] text-zinc-400">
                {liveMode
                  ? `${copy.liveDemo.callLive} · ${liveCall.secondsLeft}s`
                  : statusLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartLiveCall}
                disabled={liveMode}
                aria-label={copy.liveDemo.startCall}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full transition",
                  liveMode
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                <PhoneIcon className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleToggleDemo}
                disabled={liveMode}
                aria-label={playing ? copy.liveDemo.stopListen : copy.liveDemo.listenLive}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full transition",
                  playing
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-800",
                  liveMode && "opacity-40",
                )}
              >
                {playing ? (
                  <HeadphonesIcon className="size-3.5" aria-hidden="true" />
                ) : (
                  <PlayIcon className="size-3.5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={handleEnd}
                aria-label={copy.liveDemo.endCall}
                className="inline-flex size-8 items-center justify-center rounded-full bg-red-600 text-white"
              >
                <PhoneOffIcon className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-2.5">
            <VoiceMonitorWaveform active={waveformActive} className="h-12 rounded-lg bg-zinc-50" />
          </div>
          {errorLabel ? (
            <p className="mt-1.5 text-[10px] leading-4 text-amber-700">{errorLabel}</p>
          ) : null}
        </div>

        <div
          ref={transcriptRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-auto px-3 py-2.5"
        >
          {displayTurns.length === 0 ? (
            <p className="px-1 py-6 text-center text-[11px] leading-4 text-zinc-400">
              {copy.liveDemo.callEmptyHint}
            </p>
          ) : (
            displayTurns.map((turn) => {
              const isAi = turn.speaker === "ai";
              return (
                <div
                  key={turn.id}
                  className={cn(
                    "flex",
                    isAi ? "justify-end" : "justify-start",
                    !turn.revealed && "opacity-30",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3 py-2 text-[12px] leading-4 transition",
                      isAi
                        ? "rounded-br-md bg-zinc-900 text-white"
                        : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-800",
                      turn.active && "ring-1 ring-zinc-300",
                    )}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {copy.liveDemo.calls}
            </p>
            <h2 className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
              {LANDING_FAKE_CALL_NUMBER}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {liveMode
                ? `${copy.liveDemo.callLive} · ${liveCall.secondsLeft}s`
                : event.preview}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200/80">
            <span
              className={cn(
                "size-1.5 rounded-full",
                waveformActive ? "bg-emerald-500" : "bg-zinc-400",
              )}
            />
            {statusLabel}
          </div>
        </div>

        <div className="mt-4">
          <VoiceMonitorWaveform active={waveformActive} className="h-16 rounded-xl bg-zinc-50" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartLiveCall}
            disabled={liveMode}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-white transition",
              liveMode ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <PhoneIcon className="size-3.5" aria-hidden="true" />
            {liveMode ? `${copy.liveDemo.callLive} ${liveCall.secondsLeft}s` : copy.liveDemo.startCall}
          </button>

          <button
            type="button"
            onClick={handleToggleDemo}
            disabled={onHold || liveMode}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition",
              playing
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              (onHold || liveMode) && "opacity-50",
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
            disabled={liveMode}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
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
            disabled={liveMode}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
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
            disabled={liveMode}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
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
        {errorLabel ? (
          <p className="mt-2 text-xs text-amber-700">{errorLabel}</p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {copy.liveDemo.liveTranscript}
        </p>
        <div
          ref={transcriptRef}
          className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-auto rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3"
        >
          {displayTurns.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {copy.liveDemo.callEmptyHint}
            </p>
          ) : (
            displayTurns.map((turn) => {
              const isAi = turn.speaker === "ai";
              return (
                <div
                  key={turn.id}
                  className={cn(
                    "flex",
                    isAi ? "justify-end" : "justify-start",
                    !turn.revealed && "opacity-30",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-lg border px-3 py-2 transition",
                      isAi
                        ? "border-zinc-800 bg-zinc-900 text-white"
                        : "border-zinc-100 bg-white text-zinc-700",
                      turn.active && "ring-1 ring-zinc-300 shadow-sm",
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                      {isAi ? "AI Agent" : "Customer"}
                    </p>
                    <p className="mt-0.5 text-sm leading-5">{turn.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
