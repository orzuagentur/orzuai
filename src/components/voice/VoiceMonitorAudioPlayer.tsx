"use client";

import {
  HeadphonesIcon,
  Loader2Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { useVoiceMonitorAudio } from "@/hooks/use-voice-monitor-audio";
import { cn } from "@/lib/utils";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

type VoiceMonitorAudioPlayerProps = {
  callLogId: string | null;
  callStatus: string;
  autoStart?: boolean;
  className?: string;
};

export function VoiceMonitorAudioPlayer({
  callLogId,
  callStatus,
  autoStart = true,
  className,
}: VoiceMonitorAudioPlayerProps) {
  const isLive = isActiveVoiceCallStatus(callStatus);
  const enabled = autoStart && isLive && Boolean(callLogId);
  const monitor = useVoiceMonitorAudio({
    callLogId,
    enabled,
  });

  const statusLabel = (() => {
    switch (monitor.status) {
      case "connecting":
        return VOICE_MESSAGES.callMonitorAudioConnecting;
      case "listening":
        return VOICE_MESSAGES.callMonitorAudioListening;
      case "error":
        return monitor.errorMessage ?? VOICE_MESSAGES.callMonitorAudioError;
      case "unavailable":
        return VOICE_MESSAGES.callMonitorAudioUnavailable;
      default:
        return VOICE_MESSAGES.callMonitorAudioIdle;
    }
  })();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="size-4 shrink-0 text-primary" />
          <p className="text-sm font-medium">{VOICE_MESSAGES.callListenLive}</p>
          {monitor.isListening ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
      </div>

      <div className="flex items-center gap-2">
        {!enabled ? (
          <Button type="button" size="sm" variant="outline" disabled>
            <VolumeXIcon className="mr-2 size-4" />
            {VOICE_MESSAGES.callMonitorAudioUnavailable}
          </Button>
        ) : monitor.isListening ? (
          <Button type="button" size="sm" variant="outline" onClick={monitor.stop}>
            <VolumeXIcon className="mr-2 size-4" />
            {VOICE_MESSAGES.callMonitorAudioStop}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={monitor.status === "connecting"}
            onClick={() => void monitor.reconnect()}
          >
            {monitor.status === "connecting" ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <Volume2Icon className="mr-2 size-4" />
            )}
            {monitor.status === "connecting"
              ? VOICE_MESSAGES.callMonitorAudioConnecting
              : VOICE_MESSAGES.callMonitorAudioStart}
          </Button>
        )}
      </div>
    </div>
  );
}
