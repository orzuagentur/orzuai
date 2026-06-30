"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { VoiceCallCard } from "@/components/voice/VoiceCallCard";
import { VoiceDialPad } from "@/components/voice/VoiceDialPad";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { phoneDigits } from "@/utils/voice-contact-calls";

type VoiceInboxDialerPanelProps = {
  call: VoiceCallDetail | null;
  allCalls?: VoiceInboxCallListItem[];
  activeCallId?: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectionClear?: () => void;
  onSelectCall?: (callId: string) => void;
  initialPhone?: string;
  onOpenSms?: (phoneNumber: string, conversationId?: string | null) => void;
  onAddContact?: (phoneNumber: string) => void;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  className?: string;
};

export function VoiceInboxDialerPanel({
  call,
  allCalls = [],
  activeCallId = null,
  searchQuery,
  onSearchQueryChange,
  onSelectionClear,
  onSelectCall,
  initialPhone = "",
  onOpenSms,
  onAddContact,
  detailsOpen = false,
  onToggleDetails,
  className,
}: VoiceInboxDialerPanelProps) {
  const softphone = useVoiceSoftphone();
  const [dialedNumber, setDialedNumber] = useState(initialPhone);
  const [isCalling, startCalling] = useTransition();
  const syncedCallIdRef = useRef<string | null>(null);
  const syncedPhoneRef = useRef("");

  useEffect(() => {
    if (!call) {
      syncedCallIdRef.current = null;
      if (initialPhone && initialPhone !== syncedPhoneRef.current) {
        setDialedNumber(initialPhone);
        syncedPhoneRef.current = initialPhone;
      }
      return;
    }

    if (call.id !== syncedCallIdRef.current) {
      setDialedNumber(call.phoneNumber);
      syncedCallIdRef.current = call.id;
      syncedPhoneRef.current = call.phoneNumber;
    }
  }, [call, initialPhone]);

  const handleDialedNumberChange = useCallback(
    (nextValue: string) => {
      setDialedNumber(nextValue);

      if (!call) {
        return;
      }

      const nextDigits = phoneDigits(nextValue);
      const callDigits = phoneDigits(call.phoneNumber);

      if (!nextDigits || nextDigits !== callDigits) {
        syncedCallIdRef.current = null;
        onSelectionClear?.();
      }
    },
    [call, onSelectionClear],
  );

  const phoneToCall = dialedNumber.trim();
  const canAddContact = Boolean(phoneToCall) && !call?.contactId;

  function handleCall() {
    if (!phoneToCall) {
      return;
    }

    startCalling(async () => {
      const result = await triggerContactVoiceCallAction({
        phoneNumber: phoneToCall,
        contactId: call?.contactId ?? undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
        return;
      }

      toast.success(result.message ?? VOICE_MESSAGES.callOutboundSuccess);
    });
  }

  function handleDigitPress(digit: string) {
    if (softphone.status === "on-call" || softphone.status === "connecting") {
      softphone.sendDigits(digit);
    }
  }

  const isOnCall =
    softphone.status === "on-call" || softphone.status === "connecting";

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={VOICE_MESSAGES.softphoneSearchContacts}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
        />
        {onToggleDetails ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="hidden size-8 shrink-0 xl:inline-flex"
            onClick={onToggleDetails}
            aria-label={VOICE_MESSAGES.detailsPanelToggle}
          >
            {detailsOpen ? (
              <PanelRightCloseIcon className="size-4" />
            ) : (
              <PanelRightOpenIcon className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      <VoiceCallCard
        call={call}
        dialedNumber={dialedNumber}
        allCalls={allCalls}
        activeCallId={activeCallId}
        onOpenSms={() =>
          onOpenSms?.(phoneToCall, call?.conversationId ?? null)
        }
        onSelectCall={onSelectCall}
      />

      <VoiceDialPad
        value={dialedNumber}
        onChange={handleDialedNumberChange}
        onCall={handleCall}
        onDigitPress={handleDigitPress}
        callDisabled={isCalling || isOnCall}
      />

      {canAddContact ? (
        <div className="flex justify-center border-b px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAddContact?.(phoneToCall)}
          >
            <UserPlusIcon className="mr-2 size-4" />
            {VOICE_MESSAGES.addContactButton}
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto border-t px-4 py-4">
        {call ? (
          <>
            {call.hasRecording ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {VOICE_MESSAGES.callRecordingTitle}
                </p>
                <audio
                  controls
                  preload="none"
                  className="h-10 w-full"
                  src={`/api/voice/recording?callLogId=${call.id}`}
                />
              </div>
            ) : null}

            <h3 className="mb-2 text-sm font-medium">{VOICE_MESSAGES.callDetailTitle}</h3>
            {call.turns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {VOICE_MESSAGES.callNoTranscript}
              </p>
            ) : (
              <div className="space-y-2">
                {call.turns.map((turn, index) => (
                  <div
                    key={`${turn.role}-${index}`}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      turn.role === "assistant"
                        ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30"
                        : "bg-muted/40",
                    )}
                  >
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {turn.role === "assistant"
                        ? VOICE_MESSAGES.callTranscriptAssistant
                        : VOICE_MESSAGES.callTranscriptUser}
                    </p>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {turn.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {VOICE_MESSAGES.callDetailEmpty}
          </p>
        )}
      </div>
    </div>
  );
}
