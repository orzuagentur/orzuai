"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { VoiceCallCard } from "@/components/voice/VoiceCallCard";
import {
  findFirstActiveAiVoiceCall,
  findFirstActiveVoiceCall,
  VoiceActiveAiCallChip,
} from "@/components/voice/VoiceActiveCallBanner";
import { VoiceLiveCallCard } from "@/components/voice/VoiceLiveCallCard";
import { VoiceLiveTranscriptPanel } from "@/components/voice/VoiceLiveTranscriptPanel";
import { VoiceMonitorAudioPlayer } from "@/components/voice/VoiceMonitorAudioPlayer";
import {
  VoiceCallModeDialog,
  type VoiceCallMode,
  type VoiceCallModeSelection,
} from "@/components/voice/VoiceCallModeDialog";
import { VoiceDialPad } from "@/components/voice/VoiceDialPad";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { scheduleVoiceInboxRefresh } from "@/utils/voice-inbox-refresh";
import { phoneDigits } from "@/utils/voice-contact-calls";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

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
  const router = useRouter();
  const [dialedNumber, setDialedNumber] = useState(initialPhone);
  const [callModeOpen, setCallModeOpen] = useState(false);
  const [pendingCallMode, setPendingCallMode] = useState<VoiceCallMode | null>(
    null,
  );
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
  const lineBusyCall = findFirstActiveVoiceCall(allCalls);
  const activeAiCall = findFirstActiveAiVoiceCall(allCalls);
  const isLineBusy = Boolean(lineBusyCall);
  const isSelectedCallLive = Boolean(call && isActiveVoiceCallStatus(call.status));
  const showLiveCard =
    isSelectedCallLive && call
      ? call
      : lineBusyCall && lineBusyCall.id !== call?.id
        ? ({
            ...lineBusyCall,
            turns: call?.turns ?? [],
            turnCount: call?.turnCount ?? 0,
            hasRecording: Boolean(lineBusyCall.recordingUrl),
            events: call?.events ?? [],
          } as VoiceCallDetail)
        : null;

  function handleCall() {
    if (!phoneToCall) {
      return;
    }

    if (isLineBusy) {
      toast.error(VOICE_MESSAGES.callLineBusy);
      return;
    }

    setCallModeOpen(true);
  }

  function handleCallModeSelect(selection: VoiceCallModeSelection) {
    if (!phoneToCall || pendingCallMode) {
      return;
    }

    if (selection.mode === "human") {
      return;
    }

    setPendingCallMode("ai");

    startCalling(async () => {
      try {
        const result = await triggerContactVoiceCallAction({
          phoneNumber: phoneToCall,
          contactId: call?.contactId ?? undefined,
          customPrompt: selection.customPrompt,
        });

        if (!result.success) {
          toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
          return;
        }

        toast.success(result.message ?? VOICE_MESSAGES.callOutboundSuccess);
        setCallModeOpen(false);

        if (result.callLogId) {
          router.push(`${DASHBOARD_ROUTES.chatsVoice}?call=${result.callLogId}`);
        }

        scheduleVoiceInboxRefresh(() => router.refresh());
      } finally {
        setPendingCallMode(null);
      }
    });
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {activeAiCall && !isSelectedCallLive ? (
        <VoiceActiveAiCallChip call={activeAiCall} />
      ) : null}

      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={VOICE_MESSAGES.dialpadSearchContacts}
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

      {showLiveCard ? <VoiceLiveCallCard call={showLiveCard} /> : null}

      {showLiveCard ? (
        <div className="shrink-0 border-b px-4 py-3">
          <VoiceMonitorAudioPlayer
            callLogId={showLiveCard.id}
            callStatus={showLiveCard.status}
            autoStart={false}
          />
        </div>
      ) : null}

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
        callDisabled={
          isCalling || Boolean(pendingCallMode) || isLineBusy
        }
      />

      <VoiceCallModeDialog
        open={callModeOpen}
        phoneNumber={phoneToCall}
        humanAvailable={false}
        pendingMode={pendingCallMode}
        onOpenChange={setCallModeOpen}
        onSelectMode={handleCallModeSelect}
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

      {call?.hasRecording && !isSelectedCallLive ? (
        <div className="shrink-0 border-b px-4 py-3">
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

      <VoiceLiveTranscriptPanel
        turns={call?.turns ?? []}
        isLive={isSelectedCallLive}
        callTiming={
          call
            ? { createdAt: call.createdAt, endedAt: call.endedAt }
            : undefined
        }
      />
    </div>
  );
}
