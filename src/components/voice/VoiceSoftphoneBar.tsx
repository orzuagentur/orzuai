"use client";

import { usePathname } from "next/navigation";
import {
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
} from "lucide-react";

import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import { formatVoiceCallDuration } from "@/utils/voice-call-display";

type VoiceSoftphoneBarProps = {
  className?: string;
};

export function VoiceSoftphoneBarGate({ className }: VoiceSoftphoneBarProps) {
  const pathname = usePathname();

  if (pathname?.startsWith(DASHBOARD_ROUTES.chatsVoice)) {
    return null;
  }

  return <VoiceSoftphoneBar className={className} />;
}

export function VoiceSoftphoneBar({ className }: VoiceSoftphoneBarProps) {
  const softphone = useVoiceSoftphone();

  if (!softphone.enabled) {
    return null;
  }

  const isBusy =
    softphone.status === "connecting" ||
    softphone.status === "on-call" ||
    softphone.status === "incoming";

  if (!isBusy) {
    return null;
  }

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
        </div>
      </div>
    </div>
  );
}
