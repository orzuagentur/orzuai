"use client";

import Link from "next/link";
import { PhoneIncomingIcon, PhoneOutgoingIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  getVoiceCallStatusClassName,
  getVoiceCallStatusLabel,
  isActiveVoiceCallStatus,
} from "@/utils/voice-call-display";
import { RelativeTime } from "@/components/ui/relative-time";

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
      <ul className="divide-y">
        {calls.map((call) => {
          const isActive = call.id === activeCallId;
          const DirectionIcon =
            call.direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon;
          const displayName =
            call.contactName ?? formatContactIdentifier(call.phoneNumber);
          const href = `${DASHBOARD_ROUTES.chatsVoice}?call=${call.id}`;

          return (
            <li key={call.id}>
              {onCallSelect ? (
                <button
                  type="button"
                  onClick={() => onCallSelect(call.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    isActive && "bg-muted",
                  )}
                >
                  <CallListRowContent
                    call={call}
                    displayName={displayName}
                    DirectionIcon={DirectionIcon}
                  />
                </button>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    isActive && "bg-muted",
                  )}
                >
                  <CallListRowContent
                    call={call}
                    displayName={displayName}
                    DirectionIcon={DirectionIcon}
                  />
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
}: {
  call: VoiceInboxCallListItem;
  displayName: string;
  DirectionIcon: typeof PhoneIncomingIcon;
}) {
  return (
    <>
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          call.direction === "inbound"
            ? "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
        )}
      >
        <DirectionIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{displayName}</p>
          <RelativeTime
            value={call.createdAt}
            className="shrink-0 text-xs text-muted-foreground"
          />
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {formatContactIdentifier(call.phoneNumber)}
        </p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 text-xs",
            getVoiceCallStatusClassName(call.status),
          )}
        >
          {isActiveVoiceCallStatus(call.status) ? (
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-sky-600" />
            </span>
          ) : null}
          {getVoiceCallStatusLabel(call.status)}
          {call.aiHandled ? ` · ${VOICE_MESSAGES.callAiHandled}` : ""}
        </p>
      </div>
    </>
  );
}
