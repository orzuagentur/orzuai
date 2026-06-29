"use client";

import Link from "next/link";
import { PhoneIncomingIcon, PhoneOutgoingIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDuration,
  isMissedVoiceCallStatus,
} from "@/utils/voice-call-display";

type VoiceCallListProps = {
  calls: VoiceInboxCallListItem[];
  activeCallId: string | null;
  onCallSelect?: (callId: string) => void;
  className?: string;
};

export function VoiceCallList({
  calls,
  activeCallId,
  onCallSelect,
  className,
}: VoiceCallListProps) {
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
          const isActive = call.id === activeCallId;
          const DirectionIcon =
            call.direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon;
          const displayName =
            call.contactName ?? formatContactIdentifier(call.phoneNumber);
          const href = `${DASHBOARD_ROUTES.chatsVoice}?call=${call.id}`;
          const directionLabel =
            call.direction === "inbound"
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
}: {
  call: VoiceInboxCallListItem;
  displayName: string;
  DirectionIcon: typeof PhoneIncomingIcon;
  directionLabel: string;
}) {
  const createdAt = new Date(call.createdAt);
  const dateLabel = createdAt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeLabel = createdAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subtitle = isMissedVoiceCallStatus(call.status)
    ? VOICE_MESSAGES.callHistoryMissedLabel
    : call.status === "completed" && call.durationSeconds
      ? formatVoiceCallDuration(call.durationSeconds)
      : null;

  return (
    <>
      <ContactAvatar name={displayName} className="size-11 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{displayName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
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
