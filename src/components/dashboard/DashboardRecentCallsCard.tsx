"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2Icon, PauseIcon, PhoneIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallDirectionKind,
} from "@/utils/voice-call-display";

type DashboardRecentCallsCardProps = {
  calls: VoiceInboxCallListItem[];
};

type RecentCallRowProps = {
  call: VoiceInboxCallListItem;
  activeCallId: string | null;
  onPlayStart: (callId: string) => void;
};

function RecentCallRow({
  call,
  activeCallId,
  onPlayStart,
}: RecentCallRowProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useLocalTime, setUseLocalTime] = useState(false);
  const hasRecording = Boolean(call.recordingUrl?.trim());
  const recordingSrc = `/api/voice/recording?callLogId=${encodeURIComponent(call.id)}`;
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

  useEffect(() => {
    if (activeCallId && activeCallId !== call.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [activeCallId, call.id, isPlaying]);

  const { dateLabel, timeLabel } = formatVoiceCallDateParts(call.createdAt, {
    local: useLocalTime,
  });

  const togglePlayback = useCallback(async () => {
    if (!hasRecording) {
      toast.error(VOICE_MESSAGES.callRecordingUnavailable);
      return;
    }

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
    onPlayStart(call.id);

    try {
      // Ensure the media element reloads the proxied Twilio stream before play.
      audio.load();
      await audio.play();
      setIsPlaying(true);
    } catch {
      toast.error(VOICE_MESSAGES.callRecordingUnavailable);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [call.id, hasRecording, isPlaying, onPlayStart]);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5">
      {hasRecording ? (
        <audio
          ref={audioRef}
          preload="metadata"
          src={recordingSrc}
          onEnded={() => {
            setIsPlaying(false);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onError={() => {
            setIsPlaying(false);
            setIsLoading(false);
          }}
        />
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9 shrink-0 rounded-full"
        disabled={!hasRecording || isLoading}
        onClick={() => void togglePlayback()}
        aria-label={
          isPlaying
            ? VOICE_MESSAGES.callRecordingPause
            : VOICE_MESSAGES.callRecordingPlay
        }
        title={hasRecording ? "Play recording" : "No recording"}
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
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {directionLabel}
          {" · "}
          {dateLabel} {timeLabel}
          {call.durationSeconds != null
            ? ` · ${formatVoiceCallDuration(call.durationSeconds)}`
            : null}
          {!hasRecording ? " · No recording" : null}
        </p>
      </div>
    </div>
  );
}

export function DashboardRecentCallsCard({
  calls,
}: DashboardRecentCallsCardProps) {
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Recent calls</CardTitle>
            <CardDescription>Last 3 recorded voice calls</CardDescription>
          </div>
          <Link
            href={DASHBOARD_ROUTES.voice}
            className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/15"
            title="Open calls"
          >
            <PhoneIcon className="size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {calls.length === 0 ? (
          <p
            className={cn(
              "rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground",
            )}
          >
            No recorded calls yet.
          </p>
        ) : (
          calls.map((call) => (
            <RecentCallRow
              key={call.id}
              call={call}
              activeCallId={activeCallId}
              onPlayStart={setActiveCallId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
