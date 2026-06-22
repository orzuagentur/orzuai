"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileIcon,
  FileTextIcon,
  Loader2Icon,
  Maximize2Icon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  chatAccentProgressClassName,
  chatComposerFieldClassName,
  chatMicIconShellClassName,
  chatSendButtonClassName,
} from "@/features/chats/chat-theme";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import {
  formatUploadPercent,
  formatUploadSpeed,
} from "@/utils/format-upload-rate";

export type ComposerAttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "document";

export type ComposerAttachmentPreviewProps = {
  file: File;
  previewUrl: string | null;
  kind: ComposerAttachmentKind;
  durationMs?: number;
  caption: string;
  onCaptionChange: (value: string) => void;
  isSending: boolean;
  uploadProgress?: number;
  uploadSpeedBps?: number;
  uploadPhase?: ChatMessageData["uploadPhase"];
  onCancel: () => void;
  onSend: () => void;
};

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function getDocumentIcon(mimeType: string) {
  if (mimeType.includes("pdf") || mimeType.includes("text")) {
    return FileTextIcon;
  }

  return FileIcon;
}

function VoicePreviewPlayer({
  previewUrl,
  durationMs,
}: {
  previewUrl: string;
  durationMs?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    durationMs ? durationMs / 1000 : 0,
  );

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
  }, [previewUrl]);

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    void audio.play();
  }

  const totalDuration = duration > 0 ? duration : durationMs ? durationMs / 1000 : 0;

  return (
    <div className="flex w-full items-center gap-2 px-3">
      <audio ref={audioRef} src={previewUrl} preload="metadata" className="hidden" />
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", chatMicIconShellClassName)}>
        <MicIcon className="size-4" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0 rounded-full"
        onClick={togglePlayback}
        aria-label={isPlaying ? CHAT_MESSAGES.voicePause : CHAT_MESSAGES.voicePlay}
      >
        {isPlaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", chatAccentProgressClassName)}
            style={{
              width:
                totalDuration > 0
                  ? `${Math.min(100, (currentTime / totalDuration) * 100)}%`
                  : "0%",
            }}
          />
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatSeconds(currentTime)}
          {totalDuration > 0 ? ` / ${formatSeconds(totalDuration)}` : null}
        </p>
      </div>
    </div>
  );
}

export function ComposerAttachmentPreview({
  file,
  previewUrl,
  kind,
  durationMs,
  caption,
  onCaptionChange,
  isSending,
  uploadProgress,
  uploadSpeedBps,
  uploadPhase,
  onCancel,
  onSend,
}: ComposerAttachmentPreviewProps) {
  const DocIcon = getDocumentIcon(file.type);
  const isVoice = kind === "audio" && file.name.startsWith("voice-");
  const [imageFullscreenOpen, setImageFullscreenOpen] = useState(false);
  const showCaptionField =
    kind === "image" || kind === "video" || kind === "document" || isVoice;

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", chatComposerFieldClassName)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {isVoice
            ? CHAT_MESSAGES.voicePreviewTitle
            : CHAT_MESSAGES.mediaPreviewTitle}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          disabled={isSending}
          onClick={onCancel}
        >
          <Trash2Icon className="size-3.5" />
          {CHAT_MESSAGES.discardAttachment}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50",
            kind === "image" || kind === "video"
              ? "h-36 w-full sm:h-32 sm:w-40"
              : "h-16 w-full sm:w-56",
          )}
        >
          {kind === "image" && previewUrl ? (
            <>
              <button
                type="button"
                onClick={() => setImageFullscreenOpen(true)}
                className="h-full w-full"
                aria-label={CHAT_MESSAGES.mediaFullscreenPreview}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              </button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 size-8 bg-black/55 text-white hover:bg-black/70"
                onClick={() => setImageFullscreenOpen(true)}
                aria-label={CHAT_MESSAGES.mediaFullscreenPreview}
              >
                <Maximize2Icon className="size-4" />
              </Button>
              <Dialog open={imageFullscreenOpen} onOpenChange={setImageFullscreenOpen}>
                <DialogContent
                  showCloseButton={false}
                  className="flex max-h-[95vh] max-w-[95vw] items-center justify-center border-none bg-black/95 p-2 sm:max-w-[95vw]"
                >
                  <DialogTitle className="sr-only">{file.name}</DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 text-white hover:bg-white/10"
                    onClick={() => setImageFullscreenOpen(false)}
                    aria-label={CHAT_MESSAGES.closeMediaPreview}
                  >
                    <XIcon className="size-5" />
                  </Button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-[88vh] max-w-full object-contain"
                  />
                </DialogContent>
              </Dialog>
            </>
          ) : null}

          {kind === "video" && previewUrl ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          ) : null}

          {kind === "audio" && previewUrl ? (
            <VoicePreviewPlayer previewUrl={previewUrl} durationMs={durationMs} />
          ) : null}

          {kind === "document" ? (
            <div className="flex items-center gap-2 px-3">
              <DocIcon className="size-5 text-muted-foreground" />
              <span className="truncate text-sm">{file.name}</span>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {CHAT_MESSAGES.mediaPreviewHint}
            </p>
          </div>

          {showCaptionField ? (
            <div className="space-y-1.5">
              <Label htmlFor="composer-media-caption" className="text-xs">
                {CHAT_MESSAGES.mediaCaptionLabel}
              </Label>
              <Input
                id="composer-media-caption"
                value={caption}
                onChange={(event) => onCaptionChange(event.target.value)}
                placeholder={CHAT_MESSAGES.mediaCaptionPlaceholder}
                disabled={isSending}
                className="h-9"
              />
            </div>
          ) : null}

          {isSending && uploadPhase ? (
            <div className="space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>
                  {uploadPhase === "preparing"
                    ? CHAT_MESSAGES.mediaUploadPreparing
                    : uploadPhase === "completing"
                      ? CHAT_MESSAGES.mediaUploadCompleting
                      : formatUploadPercent(uploadProgress ?? 0)}
                </span>
                {uploadPhase === "uploading" && uploadSpeedBps ? (
                  <span className="text-muted-foreground">
                    {formatUploadSpeed(uploadSpeedBps)}
                  </span>
                ) : null}
              </div>
              {uploadPhase === "uploading" ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-150 ease-out",
                      chatAccentProgressClassName,
                    )}
                    style={{ width: `${Math.min(100, uploadProgress ?? 0)}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            className={cn("w-full gap-1.5 sm:w-auto sm:self-end", chatSendButtonClassName)}
            disabled={isSending}
            onClick={onSend}
          >
            {isSending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            {CHAT_MESSAGES.sendAttachment}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ComposerRecordingBar({
  elapsedSeconds,
  onStop,
}: {
  elapsedSeconds: number;
  onStop: () => void;
}) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
        </span>
        <span className="text-sm font-medium text-destructive">
          {CHAT_MESSAGES.voiceRecordingLabel}
        </span>
        <span className="font-mono text-sm tabular-nums text-destructive">
          {label}
        </span>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="h-8 gap-1.5"
        onClick={onStop}
      >
        {CHAT_MESSAGES.voiceStopRecording}
      </Button>
    </div>
  );
}
