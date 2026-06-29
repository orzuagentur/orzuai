"use client";

import {
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
} from "lucide-react";

import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { Button } from "@/components/ui/button";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import { formatVoiceCallDuration } from "@/utils/voice-call-display";

type VoiceSoftphoneBarProps = {
  className?: string;
};

export function VoiceSoftphoneBar({ className }: VoiceSoftphoneBarProps) {
  const softphone = useVoiceSoftphone();

  if (!softphone.enabled) {
    return null;
  }

  const isBusy =
    softphone.status === "connecting" ||
    softphone.status === "on-call" ||
    softphone.status === "incoming" ||
    softphone.status === "registering";

  return (
    <div
      className={cn(
        "shrink-0 border-b bg-muted/30 px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{VOICE_MESSAGES.softphoneTitle}</p>
          <p className="text-xs text-muted-foreground">
            {softphone.isOnline
              ? VOICE_MESSAGES.softphoneOnlineHint
              : VOICE_MESSAGES.softphoneOfflineHint}
          </p>
          {softphone.error ? (
            <p className="mt-1 text-xs text-destructive">{softphone.error}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {softphone.status === "incoming" ? (
            <>
              <Button type="button" size="sm" onClick={softphone.acceptIncoming}>
                <PhoneIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.softphoneAccept}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={softphone.rejectIncoming}
              >
                <PhoneOffIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.softphoneReject}
              </Button>
            </>
          ) : null}

          {softphone.status === "on-call" || softphone.status === "connecting" ? (
            <>
              <span className="text-xs font-medium text-sky-700 dark:text-sky-300">
                {softphone.status === "connecting"
                  ? VOICE_MESSAGES.softphoneConnecting
                  : VOICE_MESSAGES.softphoneOnCall}
              </span>
              {softphone.callElapsedSeconds !== null ? (
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatVoiceCallDuration(softphone.callElapsedSeconds)}
                </span>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={softphone.toggleMute}>
                {softphone.isMuted ? (
                  <MicOffIcon className="mr-2 size-4" />
                ) : (
                  <MicIcon className="mr-2 size-4" />
                )}
                {softphone.isMuted
                  ? VOICE_MESSAGES.softphoneUnmute
                  : VOICE_MESSAGES.softphoneMute}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={softphone.hangUp}>
                <PhoneOffIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.softphoneHangUp}
              </Button>
            </>
          ) : null}

          {!isBusy ? (
            softphone.isOnline ? (
              <Button type="button" size="sm" variant="outline" onClick={softphone.goOffline}>
                {VOICE_MESSAGES.softphoneGoOffline}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={softphone.status === "registering"}
                onClick={() => {
                  void softphone.goOnline();
                }}
              >
                {softphone.status === "registering" ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <PhoneIcon className="mr-2 size-4" />
                )}
                {VOICE_MESSAGES.softphoneGoOnline}
              </Button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
