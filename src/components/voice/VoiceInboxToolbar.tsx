"use client";

import {
  Grid3x3Icon,
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import { formatVoiceCallDuration } from "@/utils/voice-call-display";

type VoiceInboxToolbarProps = {
  showDialpadToggle: boolean;
  dialpadOpen: boolean;
  onOpenDialpad: () => void;
  className?: string;
};

export function VoiceInboxToolbar({
  showDialpadToggle,
  dialpadOpen,
  onOpenDialpad,
  className,
}: VoiceInboxToolbarProps) {
  const softphone = useVoiceSoftphone();

  if (!softphone.enabled) {
    return null;
  }

  const isBusy =
    softphone.status === "connecting" ||
    softphone.status === "on-call" ||
    softphone.status === "incoming" ||
    softphone.status === "registering";

  const isOnCall =
    softphone.status === "connecting" || softphone.status === "on-call";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {!isBusy ? (
        softphone.isOnline ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 px-3"
            onClick={softphone.goOffline}
          >
            {VOICE_MESSAGES.softphoneGoOffline}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 px-3"
            disabled={softphone.status === "registering"}
            onClick={() => {
              void softphone.goOnline().catch((error: unknown) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : VOICE_MESSAGES.softphoneUnavailable,
                );
              });
            }}
          >
            {softphone.status === "registering" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              VOICE_MESSAGES.softphoneGoOnline
            )}
          </Button>
        )
      ) : null}

      {showDialpadToggle ? (
        <Button
          type="button"
          size="icon"
          variant={dialpadOpen ? "default" : "outline"}
          className="size-8 shrink-0"
          onClick={onOpenDialpad}
          aria-label={VOICE_MESSAGES.softphoneDialpadTitle}
        >
          <Grid3x3Icon className="size-4" />
        </Button>
      ) : null}

      {softphone.status === "incoming" ? (
        <>
          <Button type="button" size="sm" className="h-8" onClick={softphone.acceptIncoming}>
            <PhoneIcon className="mr-1 size-4" />
            {VOICE_MESSAGES.softphoneAccept}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={softphone.rejectIncoming}>
            {VOICE_MESSAGES.softphoneReject}
          </Button>
        </>
      ) : null}

      {isOnCall ? (
        <>
          <span className="hidden text-xs font-medium text-sky-700 sm:inline dark:text-sky-300">
            {softphone.status === "connecting"
              ? VOICE_MESSAGES.softphoneConnecting
              : VOICE_MESSAGES.softphoneOnCall}
          </span>
          {softphone.callElapsedSeconds !== null ? (
            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {formatVoiceCallDuration(softphone.callElapsedSeconds)}
            </span>
          ) : null}
          <Button type="button" size="icon" variant="outline" className="size-8" onClick={softphone.toggleMute}>
            {softphone.isMuted ? (
              <MicOffIcon className="size-4" />
            ) : (
              <MicIcon className="size-4" />
            )}
          </Button>
          <Button type="button" size="sm" variant="destructive" className="h-8" onClick={softphone.hangUp}>
            <PhoneOffIcon className="mr-1 size-4" />
            {VOICE_MESSAGES.softphoneHangUp}
          </Button>
        </>
      ) : null}
    </div>
  );
}
