"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  HistoryIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  UserIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Button } from "@/components/ui/button";
import { VoiceContactCallHistoryDialog } from "@/components/voice/VoiceContactCallHistoryDialog";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { getCallsForContact } from "@/utils/voice-contact-calls";

type VoiceCallCardProps = {
  call: VoiceCallDetail | null;
  dialedNumber: string;
  allCalls?: VoiceInboxCallListItem[];
  activeCallId?: string | null;
  onOpenSms?: () => void;
  onSelectCall?: (callId: string) => void;
  className?: string;
};

export function VoiceCallCard({
  call,
  dialedNumber,
  allCalls = [],
  activeCallId = null,
  onOpenSms,
  onSelectCall,
  className,
}: VoiceCallCardProps) {
  const softphone = useVoiceSoftphone();
  const [historyOpen, setHistoryOpen] = useState(false);

  const isOnCall =
    softphone.status === "on-call" || softphone.status === "connecting";
  const isIncoming = softphone.status === "incoming";

  const liveNumber = softphone.activePhoneNumber?.trim() || "";
  const effectiveNumber = liveNumber || dialedNumber.trim();

  const displayName =
    call?.contactName ??
    (effectiveNumber
      ? formatContactIdentifier(effectiveNumber)
      : VOICE_MESSAGES.callDetailEmpty);

  const phoneLabel = call?.phoneNumber ?? effectiveNumber;

  const contactCalls = useMemo(
    () =>
      getCallsForContact(allCalls, {
        contactId: call?.contactId,
        phoneNumber: call?.phoneNumber ?? effectiveNumber,
      }),
    [allCalls, call?.contactId, call?.phoneNumber, effectiveNumber],
  );

  const hasQuickActions = Boolean(effectiveNumber || call);

  return (
    <>
      <div
        className={cn(
          "shrink-0 border-b bg-gradient-to-b from-muted/40 to-background px-4 py-4",
          className,
        )}
      >
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="mb-3">
            {call || effectiveNumber ? (
              <ContactAvatar name={displayName} className="size-20 text-lg" />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                <UserIcon className="size-9 text-muted-foreground" />
              </div>
            )}
          </div>

          <h2 className="max-w-full truncate text-lg font-semibold">{displayName}</h2>

          {phoneLabel ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {formatContactIdentifier(phoneLabel)}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {VOICE_MESSAGES.callCardTapToCall}
            </p>
          )}

          {hasQuickActions && !isOnCall && !isIncoming ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={onOpenSms}
                disabled={!phoneLabel}
              >
                <MessageSquareIcon className="size-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">
                  {VOICE_MESSAGES.callQuickActionsSms}
                </span>
              </Button>

              {contactCalls.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setHistoryOpen(true)}
                >
                  <HistoryIcon className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-2">
                    {VOICE_MESSAGES.callHistoryButton}
                  </span>
                </Button>
              ) : null}

              {call?.contactId ? (
                <Button type="button" size="sm" variant="outline" className="rounded-full" asChild>
                  <Link href={`${DASHBOARD_ROUTES.contacts}?contact=${call.contactId}`}>
                    <UserIcon className="size-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-2">
                      {VOICE_MESSAGES.callQuickActionsContact}
                    </span>
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {(isOnCall || isIncoming) && softphone.enabled ? (
          <InCallControls />
        ) : null}

        {!softphone.isOnline && softphone.enabled && !isOnCall && !isIncoming ? (
          <div className="mx-auto mt-4 flex max-w-sm justify-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
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
          </div>
        ) : null}

        {softphone.error ? (
          <p className="mx-auto mt-2 max-w-sm text-center text-xs text-destructive">
            {softphone.error}
          </p>
        ) : null}
      </div>

      <VoiceContactCallHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        contactName={displayName}
        calls={contactCalls}
        activeCallId={activeCallId}
        onSelectCall={onSelectCall}
      />
    </>
  );
}

function InCallControls() {
  const softphone = useVoiceSoftphone();
  const isIncoming = softphone.status === "incoming";

  if (isIncoming) {
    return (
      <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-3">
        <Button type="button" size="lg" className="rounded-full" onClick={softphone.acceptIncoming}>
          <PhoneIcon className="mr-2 size-4" />
          {VOICE_MESSAGES.softphoneAccept}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="rounded-full"
          onClick={softphone.rejectIncoming}
        >
          <PhoneOffIcon className="mr-2 size-4" />
          {VOICE_MESSAGES.softphoneReject}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={softphone.isMuted ? "default" : "outline"}
        className="size-11 rounded-full"
        onClick={softphone.toggleMute}
        aria-label={
          softphone.isMuted ? VOICE_MESSAGES.softphoneUnmute : VOICE_MESSAGES.softphoneMute
        }
      >
        {softphone.isMuted ? (
          <MicOffIcon className="size-5" />
        ) : (
          <MicIcon className="size-5" />
        )}
      </Button>

      <Button
        type="button"
        size="icon"
        variant={softphone.isSpeakerMuted ? "default" : "outline"}
        className="size-11 rounded-full"
        onClick={softphone.toggleSpeaker}
        aria-label={
          softphone.isSpeakerMuted
            ? VOICE_MESSAGES.softphoneSpeaker
            : VOICE_MESSAGES.softphoneSpeakerOff
        }
      >
        {softphone.isSpeakerMuted ? (
          <VolumeXIcon className="size-5" />
        ) : (
          <Volume2Icon className="size-5" />
        )}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="size-11 rounded-full"
        onClick={softphone.hangUp}
        aria-label={VOICE_MESSAGES.softphoneHangUp}
      >
        <PhoneOffIcon className="size-5" />
      </Button>
    </div>
  );
}
