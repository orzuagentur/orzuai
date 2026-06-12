"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type VoiceMessagePlayerProps = {
  src?: string | null;
  seed: string;
  durationSec?: number;
  isOutgoing?: boolean;
  isLoading?: boolean;
  className?: string;
};

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function buildWaveform(seed: string, count = 36): number[] {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % 1000;
  }

  return Array.from({ length: count }, (_, index) => {
    const value =
      Math.abs(Math.sin((hash + index) * 12.9898) * 43758.5453) % 1;

    return 0.2 + value * 0.8;
  });
}

export function VoiceMessagePlayer({
  src,
  seed,
  durationSec,
  isOutgoing = false,
  isLoading = false,
  className,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const bars = useMemo(() => buildWaveform(seed), [seed]);
  const progress =
    duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const canPlay = Boolean(src) && !isLoading;

  useEffect(() => {
    setDuration(durationSec ?? 0);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [durationSec, src]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [src]);

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !canPlay) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    void audio.play();
  }

  const barColor = isOutgoing ? "bg-white/85" : "bg-foreground/70";
  const barMutedColor = isOutgoing ? "bg-white/30" : "bg-foreground/20";
  const buttonClass = isOutgoing
    ? "bg-white/20 text-white hover:bg-white/30"
    : "bg-foreground/10 text-foreground hover:bg-foreground/15";
  const durationClass = isOutgoing
    ? "text-emerald-100/90"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex min-w-[220px] max-w-[min(300px,100%)] items-center gap-2.5 py-0.5",
        className,
      )}
    >
      {src ? (
        <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-9 shrink-0 rounded-full", buttonClass)}
        disabled={!canPlay}
        onClick={togglePlayback}
        aria-label={
          isLoading
            ? CHAT_MESSAGES.voicePreviewTitle
            : isPlaying
              ? CHAT_MESSAGES.voicePause
              : CHAT_MESSAGES.voicePlay
        }
      >
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : isPlaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </Button>

      <div className="flex min-w-0 flex-1 items-end gap-0.5">
        {bars.map((height, index) => {
          const barProgress = (index + 1) / bars.length;
          const isActive = progress >= barProgress;

          return (
            <span
              key={`${seed}-${index}`}
              className={cn(
                "w-[3px] shrink-0 rounded-full transition-colors",
                isLoading && "animate-pulse",
                isActive || isLoading ? barColor : barMutedColor,
              )}
              style={{ height: `${height * 28}px` }}
            />
          );
        })}
      </div>

      <span
        className={cn(
          "shrink-0 text-[11px] font-medium tabular-nums",
          durationClass,
        )}
      >
        {formatDuration(
          isPlaying || currentTime > 0
            ? currentTime
            : duration > 0
              ? duration
              : durationSec ?? 0,
        )}
      </span>
    </div>
  );
}
