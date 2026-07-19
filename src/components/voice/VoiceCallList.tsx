"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneIncomingIcon, PhoneMissedIcon, PhoneOutgoingIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallDirectionKind,
  isActiveVoiceCallStatus,
} from "@/utils/voice-call-display";
import { getVoiceCallListKey } from "@/utils/voice-contact-calls";

type VoiceCallListProps = {
  calls: VoiceInboxCallListItem[];
  activeCallId: string | null;
  activeContactKey?: string | null;
  activeLiveCallIds?: Set<string>;
  onCallSelect?: (callId: string) => void;
  className?: string;
};

export function VoiceCallList({
  calls,
  activeCallId,
  activeContactKey = null,
  activeLiveCallIds,
  onCallSelect,
  className,
}: VoiceCallListProps) {
  const [useLocalTime, setUseLocalTime] = useState(false);

  useEffect(() => {
    setUseLocalTime(true);
  }, []);

  if (calls.length === 0) {
    return (
      <EmptyState
        className={cn("h-full border-0", className)}
        title={VOICE_MESSAGES.inboxEmptyTitle}
        description={VOICE_MESSAGES.inboxEmptyDescription}
      />
    );
  }

  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
      <ul>
        {calls.map((call) => {
          const rowKey = getVoiceCallListKey(call);
          const isActive =
            rowKey === activeContactKey || call.id === activeCallId;
          const isLive =
            activeLiveCallIds?.has(call.id)
            ?? isActiveVoiceCallStatus(call.status);
          const directionKind = getVoiceCallDirectionKind(call);
          const DirectionIcon =
            directionKind === "missed"
              ? PhoneMissedIcon
              : call.direction === "inbound"
                ? PhoneIncomingIcon
                : PhoneOutgoingIcon;
          const displayName =
            call.contactName ?? formatContactIdentifier(call.phoneNumber);
          const href = `${DASHBOARD_ROUTES.voice}?call=${call.id}`;
          const directionLabel =
            directionKind === "missed"
              ? VOICE_MESSAGES.callHistoryMissedLabel
              : call.direction === "inbound"
                ? VOICE_MESSAGES.callDirectionInbound
                : VOICE_MESSAGES.callDirectionOutbound;

          const rowClassName = cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
            isActive && "bg-muted/70",
          );

          const content = (
            <CallListRowContent
              call={call}
              displayName={displayName}
              DirectionIcon={DirectionIcon}
              directionLabel={directionLabel}
              useLocalTime={useLocalTime}
              isMissed={directionKind === "missed"}
              isLive={isLive}
            />
          );

          return (
            <li key={call.id}>
              {onCallSelect ? (
                <button type="button" onClick={() => onCallSelect(call.id)} className={rowClassName}>
                  {content}
                </button>
              ) : (
                <Link href={href} className={rowClassName}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CallListRowContent({
  call,
  displayName,
  DirectionIcon,
  directionLabel,
  useLocalTime,
  isMissed,
  isLive,
}: {
  call: VoiceInboxCallListItem;
  displayName: string;
  DirectionIcon: typeof PhoneIncomingIcon;
  directionLabel: string;
  useLocalTime: boolean;
  isMissed: boolean;
  isLive: boolean;
}) {
  const { dateLabel, timeLabel } = formatVoiceCallDateParts(call.createdAt, {
    local: useLocalTime,
  });

  const subtitle = isMissed
    ? null
    : call.status === "completed" && call.durationSeconds
      ? formatVoiceCallDuration(call.durationSeconds)
      : null;

  return (
    <>
      <ContactAvatar name={displayName} className="size-11 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{displayName}</p>
          {isLive ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300"
              title={VOICE_MESSAGES.callLiveBadge}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-600" />
              </span>
              {VOICE_MESSAGES.callLiveBadge}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1.5 text-sm",
            isMissed ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
          )}
        >
          <DirectionIcon className="size-3.5 shrink-0" />
          <span>{directionLabel}</span>
          {subtitle ? <span>· {subtitle}</span> : null}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p>{dateLabel}</p>
        <p className="mt-0.5">{timeLabel}</p>
      </div>
    </>
  );
}
