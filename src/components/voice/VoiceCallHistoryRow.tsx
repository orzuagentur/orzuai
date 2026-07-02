"use client";

import { useEffect, useState } from "react";
import {
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOutgoingIcon,
} from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallDirectionKind,
} from "@/utils/voice-call-display";

type VoiceCallHistoryRowProps = {
  call: VoiceInboxCallListItem;
  onClick?: () => void;
  className?: string;
};

export function VoiceCallHistoryRow({
  call,
  onClick,
  className,
}: VoiceCallHistoryRowProps) {
  const [useLocalTime, setUseLocalTime] = useState(false);

  useEffect(() => {
    setUseLocalTime(true);
  }, []);

  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const { dateLabel, timeLabel } = formatVoiceCallDateParts(call.createdAt, {
    local: useLocalTime,
  });
  const directionKind = getVoiceCallDirectionKind(call);
  const DirectionIcon =
    directionKind === "missed"
      ? PhoneMissedIcon
      : directionKind === "inbound"
        ? PhoneIncomingIcon
        : PhoneOutgoingIcon;
  const directionLabel =
    directionKind === "missed"
      ? VOICE_MESSAGES.callHistoryMissedLabel
      : directionKind === "inbound"
        ? VOICE_MESSAGES.callDirectionInbound
        : VOICE_MESSAGES.callDirectionOutbound;

  const content = (
    <>
      <ContactAvatar name={displayName} className="size-10 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{displayName}</p>
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1.5 text-xs",
            directionKind === "missed"
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground",
          )}
        >
          <DirectionIcon className="size-3.5 shrink-0" />
          <span>{directionLabel}</span>
          {call.durationSeconds ? (
            <span>· {formatVoiceCallDuration(call.durationSeconds)}</span>
          ) : null}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p>{dateLabel}</p>
        <p className="mt-0.5 tabular-nums">{timeLabel}</p>
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
        className,
      )}
    >
      {content}
    </button>
  );
}
