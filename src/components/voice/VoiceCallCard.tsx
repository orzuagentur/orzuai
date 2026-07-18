"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  HistoryIcon,
  Loader2Icon,
  MessageSquareIcon,
  UserIcon,
} from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Button } from "@/components/ui/button";
import { VoiceContactCallHistoryDialog } from "@/components/voice/VoiceContactCallHistoryDialog";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { getPhoneCountryLabel } from "@/utils/voice-call-display";
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
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeCallStatuses = new Set([
    "active",
    "ringing",
    "initiated",
    "in-progress",
  ]);
  const isAiCallLive =
    Boolean(call) &&
    (call?.callMode === "ai" || call?.callMode === "handoff") &&
    activeCallStatuses.has((call?.status ?? "").toLowerCase());

  const effectiveNumber = dialedNumber.trim();

  const displayName =
    call?.contactName ??
    (effectiveNumber
      ? formatContactIdentifier(effectiveNumber)
      : VOICE_MESSAGES.callDetailEmpty);

  const phoneLabel = call?.phoneNumber ?? effectiveNumber;
  const phoneCountry = phoneLabel ? getPhoneCountryLabel(phoneLabel) : null;

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

          {phoneCountry ? (
            <p className="mt-1 text-xs text-muted-foreground">{phoneCountry}</p>
          ) : null}

          {hasQuickActions ? (
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

          {isAiCallLive ? (
            <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              <Loader2Icon className="size-4 animate-spin" />
              {VOICE_MESSAGES.aiCallLive}
            </p>
          ) : null}
        </div>
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
