"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallDirectionKind,
} from "@/utils/voice-call-display";

type VoiceRecordingCardProps = {
  call: VoiceInboxCallListItem;
  onDeleted?: (callId: string) => void;
  className?: string;
};

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function VoiceRecordingCard({
  call,
  onDeleted,
  className,
}: VoiceRecordingCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [useLocalTime, setUseLocalTime] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const recordingSrc = `/api/voice/recording?callLogId=${call.id}`;
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const directionKind = getVoiceCallDirectionKind(call);
  const directionLabel =
    directionKind === "missed"
      ? VOICE_MESSAGES.callHistoryMissedLabel
      : directionKind === "inbound"
        ? VOICE_MESSAGES.callDirectionInbound
        : VOICE_MESSAGES.callDirectionOutbound;

  useEffect(() => {
    setUseLocalTime(true);
  }, []);

  const { dateLabel, timeLabel } = formatVoiceCallDateParts(call.createdAt, {
    local: useLocalTime,
  });

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      toast.error(VOICE_MESSAGES.callRecordingUnavailable);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(recordingSrc);
      if (!response.ok) {
        throw new Error("download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safePhone = call.phoneNumber.replace(/[^\d+]/g, "") || "call";
      anchor.href = url;
      anchor.download = `recording-${safePhone}-${call.id.slice(0, 8)}.mp3`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(VOICE_MESSAGES.callRecordingDownloadFailed);
    } finally {
      setIsDownloading(false);
    }
  }, [call.id, call.phoneNumber, recordingSrc]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/voice/recording", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callLogId: call.id }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? VOICE_MESSAGES.callRecordingDeleteFailed);
      }

      audioRef.current?.pause();
      setIsPlaying(false);
      toast.success(result.message ?? VOICE_MESSAGES.callRecordingDeleteSuccess);
      onDeleted?.(call.id);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : VOICE_MESSAGES.callRecordingDeleteFailed,
      );
    } finally {
      setIsDeleting(false);
    }
  }, [call.id, onDeleted]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={recordingSrc}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || call.durationSeconds || 0);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="flex items-start gap-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-10 shrink-0 rounded-full"
          disabled={isLoading || isDeleting}
          onClick={() => void togglePlayback()}
          aria-label={
            isPlaying ? VOICE_MESSAGES.callRecordingPause : VOICE_MESSAGES.callRecordingPlay
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

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {directionLabel}
                {" · "}
                {dateLabel} {timeLabel}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  disabled={isDeleting}
                  aria-label="Recording actions"
                >
                  {isDeleting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <MoreVerticalIcon className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  disabled={isDownloading}
                  onClick={() => void handleDownload()}
                >
                  {isDownloading ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <DownloadIcon className="mr-2 size-4" />
                  )}
                  {VOICE_MESSAGES.callRecordingDownload}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => void handleDelete()}
                >
                  <Trash2Icon className="mr-2 size-4" />
                  {VOICE_MESSAGES.callRecordingDelete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
              <span>{formatPlaybackTime(currentTime)}</span>
              <span>
                {formatPlaybackTime(
                  duration || call.durationSeconds || 0,
                )}
                {call.durationSeconds
                  ? ` · ${formatVoiceCallDuration(call.durationSeconds)}`
                  : null}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
