"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  FileTextIcon,
  HeadphonesIcon,
  HistoryIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PencilIcon,
  PhoneIcon,
  PhoneOffIcon,
  UserPlusIcon,
  VoicemailIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Button } from "@/components/ui/button";
import { VoiceCallHistoryRow } from "@/components/voice/VoiceCallHistoryRow";
import { VoiceCallModeDialog, type VoiceCallModeSelection } from "@/components/voice/VoiceCallModeDialog";
import { VoiceDialPad } from "@/components/voice/VoiceDialPad";
import { VoiceEditContactDialog } from "@/components/voice/VoiceEditContactDialog";
import { VoiceRecordingCard } from "@/components/voice/VoiceRecordingCard";
import { VoiceTranscriptTurns } from "@/components/voice/VoiceTranscriptTurns";
import { VoiceMonitorWaveform } from "@/components/voice/workspace/VoiceMonitorWaveform";
import type { VoiceWorkspaceView } from "@/components/voice/workspace/voice-workspace.types";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { useLiveCallTimer } from "@/hooks/use-live-call-timer";
import { useVoiceMonitorAudio } from "@/hooks/use-voice-monitor-audio";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  buildPlaceholderVoiceCallDetail,
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallStatusClassName,
  getVoiceCallStatusLabel,
  isActiveVoiceCallStatus,
} from "@/utils/voice-call-display";
import {
  findFirstActiveVoiceCall,
} from "@/components/voice/VoiceActiveCallBanner";
import {
  playCallDisconnectedTone,
  startOutboundRingback,
  stopOutboundRingback,
} from "@/lib/voice/call-sounds";
import { requestEndVoiceCall } from "@/lib/voice/request-end-call";
import { scheduleVoiceInboxRefresh } from "@/utils/voice-inbox-refresh";
import {
  getCallsForContact,
  isPhoneInPhonebook,
  phoneDigits,
  phonesMatch,
  summarizeContactCalls,
} from "@/utils/voice-contact-calls";

function mergeListItemToDetail(
  listItem: VoiceInboxCallListItem,
  detail: VoiceCallDetail | null,
): VoiceCallDetail {
  return {
    ...listItem,
    contactName: listItem.contactName ?? detail?.contactName ?? null,
    contactId: listItem.contactId ?? detail?.contactId ?? null,
    turns: detail?.turns ?? [],
    turnCount: detail?.turnCount ?? 0,
    hasRecording: Boolean(listItem.recordingUrl?.trim() || detail?.hasRecording),
    events: detail?.events ?? [],
  };
}

function isEphemeralLiveCallId(callId: string): boolean {
  return callId.startsWith("pending-") || callId === "softphone-live";
}

type VoiceWorkspacePanelProps = {
  view: VoiceWorkspaceView;
  onViewChange: (view: VoiceWorkspaceView) => void;
  call: VoiceCallDetail | null;
  allCalls: VoiceInboxCallListItem[];
  activeCallId?: string | null;
  initialPhone?: string;
  onSelectCall?: (callId: string) => void;
  onOpenSms?: (phoneNumber: string, conversationId?: string | null) => void;
  onAddContact?: (phoneNumber: string) => void;
  onContactUpdated?: (input: {
    contactId: string;
    phoneNumber: string;
    name: string;
  }) => void;
  onContactDeleted?: (contactId: string) => void;
  onPhoneHistoryDeleted?: (phoneNumber: string) => void;
  onRecordingDeleted?: (callId: string) => void;
  phonebookContacts?: PhoneContactListItem[];
  className?: string;
};

export function VoiceWorkspacePanel({
  view,
  onViewChange,
  call,
  allCalls,
  activeCallId = null,
  initialPhone = "",
  onSelectCall,
  onOpenSms,
  onAddContact,
  onContactUpdated,
  onContactDeleted,
  onPhoneHistoryDeleted,
  onRecordingDeleted,
  phonebookContacts = [],
  className,
}: VoiceWorkspacePanelProps) {
  const router = useRouter();
  const softphone = useVoiceSoftphone();
  const [dialedNumber, setDialedNumber] = useState(initialPhone);
  const [callModeOpen, setCallModeOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [optimisticLiveCall, setOptimisticLiveCall] = useState<VoiceCallDetail | null>(null);
  const prevSoftphoneStatusRef = useRef(softphone.status);

  useEffect(() => {
    if (initialPhone) {
      setDialedNumber(initialPhone);
    }
  }, [initialPhone]);

  useEffect(() => {
    if (call?.phoneNumber) {
      setDialedNumber(call.phoneNumber);
    }
  }, [call?.phoneNumber, call?.id]);

  const lineBusyCall = findFirstActiveVoiceCall(allCalls);
  const isLineBusy = Boolean(lineBusyCall);
  const phoneToCall = dialedNumber.trim();
  const contactCalls = useMemo(
    () =>
      getCallsForContact(allCalls, {
        contactId: call?.contactId,
        phoneNumber: phoneToCall || call?.phoneNumber,
      }),
    [allCalls, call?.contactId, call?.phoneNumber, phoneToCall],
  );
  const contactSummary = useMemo(
    () => summarizeContactCalls(contactCalls),
    [contactCalls],
  );

  const openOptimisticLiveView = useCallback(
    (phoneNumber: string, options?: {
      callMode?: string;
      aiHandled?: boolean;
      humanHandled?: boolean;
    }) => {
      const id = `pending-${Date.now()}`;
      setOptimisticLiveCall(
        buildPlaceholderVoiceCallDetail({
          id,
          phoneNumber,
          status: "ringing",
          contactId: call?.contactId ?? null,
          contactName: call?.contactName ?? null,
          callMode: options?.callMode ?? "human",
          aiHandled: options?.aiHandled ?? false,
          humanHandled: options?.humanHandled ?? options?.callMode === "human",
        }),
      );
      onViewChange({ mode: "live", callId: id });
      return id;
    },
    [call?.contactId, call?.contactName, onViewChange],
  );

  const liveCall = useMemo(() => {
    if (view.mode === "live" && "callId" in view) {
      if (call?.id === view.callId) {
        return call;
      }

      const fromList = allCalls.find((item) => item.id === view.callId);
      if (fromList) {
        return mergeListItemToDetail(fromList, call);
      }

      if (optimisticLiveCall?.id === view.callId) {
        return optimisticLiveCall;
      }

      if (view.callId === "softphone-live" || isEphemeralLiveCallId(view.callId)) {
        const phone =
          softphone.activePhoneNumber?.trim()
          || phoneToCall
          || call?.phoneNumber
          || "";

        if (phone) {
          return buildPlaceholderVoiceCallDetail({
            id: view.callId,
            phoneNumber: phone,
            status:
              softphone.status === "on-call" ? "in-progress" : "ringing",
            contactId: call?.contactId ?? null,
            contactName: call?.contactName ?? null,
            callMode: optimisticLiveCall?.callMode ?? "human",
            aiHandled: optimisticLiveCall?.aiHandled ?? false,
            humanHandled: optimisticLiveCall?.humanHandled ?? true,
          });
        }
      }

      const phone =
        softphone.activePhoneNumber?.trim()
        || phoneToCall
        || call?.phoneNumber
        || "";

      if (phone) {
        return buildPlaceholderVoiceCallDetail({
          id: view.callId,
          phoneNumber: phone,
          status:
            softphone.status === "on-call" ? "in-progress" : "ringing",
          contactId: call?.contactId ?? null,
          contactName: call?.contactName ?? null,
          callMode: optimisticLiveCall?.callMode ?? call?.callMode ?? "human",
          aiHandled: optimisticLiveCall?.aiHandled ?? call?.aiHandled ?? false,
          humanHandled:
            optimisticLiveCall?.humanHandled ?? call?.humanHandled ?? true,
        });
      }

      return null;
    }

    if (call && isActiveVoiceCallStatus(call.status)) {
      return call;
    }

    if (
      softphone.status === "connecting"
      || softphone.status === "on-call"
      || softphone.status === "incoming"
    ) {
      const phone = softphone.activePhoneNumber?.trim() || phoneToCall;
      const match = phone
        ? allCalls.find(
            (item) =>
              phonesMatch(item.phoneNumber, phone)
              && isActiveVoiceCallStatus(item.status),
          )
        : null;

      if (match) {
        return mergeListItemToDetail(match, call);
      }

      if (phone) {
        return buildPlaceholderVoiceCallDetail({
          id: "softphone-live",
          phoneNumber: phone,
          status:
            softphone.status === "on-call" ? "in-progress" : "ringing",
          callMode: "human",
          humanHandled: true,
          contactId: call?.contactId ?? null,
          contactName: call?.contactName ?? null,
        });
      }
    }

    return null;
  }, [
    allCalls,
    call,
    optimisticLiveCall,
    phoneToCall,
    softphone.activePhoneNumber,
    softphone.status,
    view,
  ]);

  useEffect(() => {
    if (!optimisticLiveCall) {
      return;
    }

    const match = allCalls.find(
      (item) =>
        phonesMatch(item.phoneNumber, optimisticLiveCall.phoneNumber)
        && isActiveVoiceCallStatus(item.status),
    );

    if (!match) {
      return;
    }

    setOptimisticLiveCall(null);

    if (view.mode === "live") {
      onViewChange({ mode: "live", callId: match.id });
      onSelectCall?.(match.id);
    }
  }, [allCalls, onSelectCall, onViewChange, optimisticLiveCall, view.mode]);

  useEffect(() => {
    if (
      softphone.status !== "connecting"
      && softphone.status !== "on-call"
      && softphone.status !== "incoming"
    ) {
      return;
    }

    const phone = softphone.activePhoneNumber?.trim();
    if (!phone) {
      return;
    }

    const match = allCalls.find(
      (item) =>
        phonesMatch(item.phoneNumber, phone)
        && isActiveVoiceCallStatus(item.status),
    );

    if (view.mode === "live") {
      return;
    }

    onViewChange({
      mode: "live",
      callId: match?.id ?? "softphone-live",
    });
  }, [
    allCalls,
    onViewChange,
    softphone.activePhoneNumber,
    softphone.status,
    view.mode,
  ]);

  const transcriptCall = useMemo(() => {
    if (view.mode !== "transcript") {
      return call;
    }
    if (call?.id === view.callId) {
      return call;
    }
    const listItem = allCalls.find((item) => item.id === view.callId);
    if (!listItem) {
      return call;
    }
    return {
      ...listItem,
      turns: [],
      turnCount: 0,
      hasRecording: Boolean(listItem.recordingUrl),
      events: [],
    } as VoiceCallDetail;
  }, [allCalls, call, view]);

  const callsWithRecording = useMemo(
    () => allCalls.filter((item) => Boolean(item.recordingUrl?.trim())),
    [allCalls],
  );

  const callsWithTranscript = useMemo(
    () =>
      allCalls.filter(
        (item) =>
          item.id === activeCallId ||
          !isActiveVoiceCallStatus(item.status),
      ),
    [activeCallId, allCalls],
  );

  const handleCall = useCallback(() => {
    if (!phoneToCall) {
      return;
    }
    if (isLineBusy) {
      toast.error(VOICE_MESSAGES.callLineBusy);
      return;
    }
    setCallModeOpen(true);
  }, [isLineBusy, phoneToCall]);

  const hasNumberSelected = Boolean(
    activeCallId || initialPhone.trim() || call?.phoneNumber,
  );

  const resolveBackView = useCallback((): VoiceWorkspaceView => {
    return hasNumberSelected ? { mode: "home" } : { mode: "dialpad" };
  }, [hasNumberSelected]);

  const handleCallModeSelect = useCallback(
    (selection: VoiceCallModeSelection) => {
      if (!phoneToCall) {
        return;
      }
      const mode = selection.mode;

      if (mode === "human") {
        if (!softphone.isOnline) {
          toast.message(VOICE_MESSAGES.softphoneGoOnlineFirst);
          return;
        }

        openOptimisticLiveView(phoneToCall, {
          callMode: "human",
          humanHandled: true,
        });
        setCallModeOpen(false);

        void softphone
          .placeCall(phoneToCall)
          .then(() => {
            scheduleVoiceInboxRefresh(() => router.refresh());
          })
          .catch((error: unknown) => {
            setOptimisticLiveCall(null);
            onViewChange(resolveBackView());
            toast.error(
              error instanceof Error
                ? error.message
                : VOICE_MESSAGES.callOutboundFailed,
            );
          });
        return;
      }

      openOptimisticLiveView(phoneToCall, {
        callMode: "ai",
        aiHandled: true,
      });
      setCallModeOpen(false);

      void (async () => {
        try {
          const result = await triggerContactVoiceCallAction({
            phoneNumber: phoneToCall,
            contactId: call?.contactId ?? undefined,
            customPrompt: selection.customPrompt,
          });
          if (!result.success) {
            setOptimisticLiveCall(null);
            onViewChange(resolveBackView());
            toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
            return;
          }
          if (result.callLogId) {
            setOptimisticLiveCall(null);
            onSelectCall?.(result.callLogId);
            onViewChange({ mode: "live", callId: result.callLogId });
          }
          scheduleVoiceInboxRefresh(() => router.refresh());
        } catch {
          setOptimisticLiveCall(null);
          onViewChange(resolveBackView());
          toast.error(VOICE_MESSAGES.callOutboundFailed);
        }
      })();
    },
    [
      call?.contactId,
      onSelectCall,
      onViewChange,
      openOptimisticLiveView,
      phoneToCall,
      resolveBackView,
      router,
      softphone,
    ],
  );

  const handleEndCall = useCallback(
    (callLogId: string) => {
      const parentCallSid = softphone.activeCallSid;
      const isEphemeral =
        isEphemeralLiveCallId(callLogId) || callLogId === "softphone-live";

      stopOutboundRingback();

      if (
        softphone.status === "connecting"
        || softphone.status === "on-call"
        || softphone.status === "incoming"
      ) {
        softphone.hangUp();
      } else {
        playCallDisconnectedTone();
      }

      setOptimisticLiveCall(null);
      onViewChange(resolveBackView());

      void (async () => {
        const result = await requestEndVoiceCall({
          callLogId: isEphemeral ? undefined : callLogId,
          parentCallSid: parentCallSid ?? undefined,
          phoneNumber: softphone.activePhoneNumber ?? (phoneToCall || undefined),
        });

        scheduleVoiceInboxRefresh(() => router.refresh());

        if (!result.success && !isEphemeral && !parentCallSid) {
          toast.error(result.message ?? VOICE_MESSAGES.callEndFailed);
        }
      })();
    },
    [onViewChange, resolveBackView, router, softphone],
  );

  useEffect(() => {
    if (view.mode !== "live" || !("callId" in view)) {
      return;
    }

    if (isEphemeralLiveCallId(view.callId) || view.callId === "softphone-live") {
      return;
    }

    if (
      softphone.status === "connecting"
      || softphone.status === "on-call"
      || softphone.status === "incoming"
    ) {
      return;
    }

    const listCall = allCalls.find((item) => item.id === view.callId);
    if (listCall && !isActiveVoiceCallStatus(listCall.status)) {
      setOptimisticLiveCall(null);
      onViewChange(resolveBackView());
    }
  }, [allCalls, onViewChange, resolveBackView, softphone.status, view]);

  useEffect(() => {
    const previous = prevSoftphoneStatusRef.current;
    prevSoftphoneStatusRef.current = softphone.status;

    const wasLiveSession =
      previous === "connecting"
      || previous === "on-call"
      || previous === "incoming";
    const isIdle =
      softphone.status === "ready"
      || softphone.status === "offline";

    if (wasLiveSession && isIdle && view.mode === "live") {
      setOptimisticLiveCall(null);
      onViewChange(resolveBackView());
      scheduleVoiceInboxRefresh(() => router.refresh());
    }
  }, [onViewChange, resolveBackView, router, softphone.status, view.mode]);

  const isOnCall =
    softphone.status === "on-call" || softphone.status === "connecting";

  const phonebookMatch = useMemo(
    () =>
      phonebookContacts.find((contact) =>
        phonesMatch(contact.phoneNumber, phoneToCall),
      ) ?? null,
    [phonebookContacts, phoneToCall],
  );

  const canAddContact =
    phoneDigits(phoneToCall).length >= 8 &&
    !call?.contactId &&
    !isPhoneInPhonebook(phoneToCall, phonebookContacts);

  const resolvedContactName =
    call?.contactName ?? phonebookMatch?.name ?? null;

  const editableContact =
    phonebookMatch
    ?? phonebookContacts.find((contact) => contact.id === call?.contactId)
    ?? null;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {view.mode === "dialpad" ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <VoiceDialPad
            value={dialedNumber}
            onChange={setDialedNumber}
            onCall={handleCall}
            onDigitPress={(digit) => {
              if (isOnCall) {
                softphone.sendDigits(digit);
              }
            }}
            callDisabled={isOnCall || isLineBusy}
            onAddContact={
              canAddContact ? () => onAddContact?.(phoneToCall) : undefined
            }
            className="py-6"
          />
        </div>
      ) : null}

      {view.mode === "home" ? (
        <WorkspaceContactInfo
          displayName={
            resolvedContactName
            ?? (phoneToCall ? formatContactIdentifier(phoneToCall) : VOICE_MESSAGES.callDetailEmpty)
          }
          phoneToCall={phoneToCall}
          contactSummary={contactSummary}
          callDisabled={isOnCall || isLineBusy}
          onCall={handleCall}
          onOpenHistory={() => onViewChange({ mode: "history" })}
          onOpenRecordings={() => onViewChange({ mode: "recordings" })}
          onOpenTranscripts={() => onViewChange({ mode: "transcripts" })}
          onOpenSms={() =>
            onOpenSms?.(phoneToCall, call?.conversationId ?? null)
          }
          onAddContact={
            canAddContact ? () => onAddContact?.(phoneToCall) : undefined
          }
          editableContact={editableContact}
          onEditContact={
            phoneDigits(phoneToCall).length >= 8
              ? () => setEditContactOpen(true)
              : undefined
          }
          recentCalls={contactCalls.slice(0, 4)}
          onRecentCallSelect={(callId) => {
            onSelectCall?.(callId);
            const selected = allCalls.find((item) => item.id === callId);
            if (selected && isActiveVoiceCallStatus(selected.status)) {
              onViewChange({ mode: "live", callId });
            } else {
              onViewChange({ mode: "home" });
            }
          }}
        />
      ) : null}

      {view.mode === "history" ? (
        <WorkspaceListShell
          title={VOICE_MESSAGES.callHistoryTitle}
          onBack={() => onViewChange(resolveBackView())}
        >
          <CallRows
            calls={contactCalls.length > 0 ? contactCalls : allCalls}
            onSelect={(callId) => {
              onSelectCall?.(callId);
              const selected = allCalls.find((item) => item.id === callId);
              if (selected && isActiveVoiceCallStatus(selected.status)) {
                onViewChange({ mode: "live", callId });
              } else {
                onViewChange({ mode: "home" });
              }
            }}
          />
        </WorkspaceListShell>
      ) : null}

      {view.mode === "recordings" ? (
        <WorkspaceListShell
          title={VOICE_MESSAGES.callRecordingTitle}
          onBack={() => onViewChange(resolveBackView())}
        >
          {callsWithRecording.length === 0 ? (
            <EmptyWorkspaceMessage text={VOICE_MESSAGES.callRecordingUnavailable} />
          ) : (
            <div className="space-y-3 p-4">
              {callsWithRecording.map((item) => (
                <VoiceRecordingCard
                  key={item.id}
                  call={item}
                  onDeleted={onRecordingDeleted}
                />
              ))}
            </div>
          )}
        </WorkspaceListShell>
      ) : null}

      {view.mode === "transcripts" ? (
        <WorkspaceListShell
          title={VOICE_MESSAGES.callTranscriptLive}
          onBack={() => onViewChange(resolveBackView())}
        >
          <CallRows
            calls={callsWithTranscript}
            onSelect={(callId) =>
              onViewChange({ mode: "transcript", callId, returnMode: "transcripts" })
            }
          />
        </WorkspaceListShell>
      ) : null}

      {view.mode === "transcript" && transcriptCall ? (
        <WorkspaceTranscriptView
          call={transcriptCall}
          onClose={() =>
            onViewChange(
              view.returnMode === "transcripts"
                ? { mode: "transcripts" }
                : resolveBackView(),
            )
          }
        />
      ) : null}

      {view.mode === "live" && liveCall ? (
        <WorkspaceLiveView
          call={liveCall}
          onBack={() => onViewChange(resolveBackView())}
          onEndCall={() => handleEndCall(liveCall.id)}
          onOpenTranscript={() =>
            onViewChange({ mode: "transcript", callId: liveCall.id })
          }
        />
      ) : null}

      <VoiceCallModeDialog
        open={callModeOpen}
        phoneNumber={phoneToCall}
        humanAvailable={softphone.enabled && !isOnCall}
        pendingMode={null}
        onOpenChange={setCallModeOpen}
        onSelectMode={handleCallModeSelect}
      />

      <VoiceEditContactDialog
        open={editContactOpen}
        onOpenChange={setEditContactOpen}
        contact={editableContact}
        phoneNumber={phoneToCall}
        onContactUpdated={(updated) => {
          setDialedNumber(updated.phoneNumber);
          onContactUpdated?.(updated);
        }}
        onContactDeleted={(contactId) => {
          onContactDeleted?.(contactId);
        }}
        onPhoneHistoryDeleted={(phone) => {
          onPhoneHistoryDeleted?.(phone);
        }}
      />
    </div>
  );
}

function WorkspaceContactInfo({
  displayName,
  phoneToCall,
  contactSummary,
  callDisabled,
  onCall,
  onOpenHistory,
  onOpenRecordings,
  onOpenTranscripts,
  onOpenSms,
  onAddContact,
  editableContact,
  onEditContact,
  recentCalls,
  onRecentCallSelect,
}: {
  displayName: string;
  phoneToCall: string;
  contactSummary: ReturnType<typeof summarizeContactCalls>;
  callDisabled: boolean;
  onCall: () => void;
  onOpenHistory: () => void;
  onOpenRecordings: () => void;
  onOpenTranscripts: () => void;
  onOpenSms: () => void;
  onAddContact?: () => void;
  editableContact?: PhoneContactListItem | null;
  onEditContact?: () => void;
  recentCalls: VoiceInboxCallListItem[];
  onRecentCallSelect?: (callId: string) => void;
}) {
  const showAddContact = Boolean(onAddContact);
  const showEditContact = Boolean(onEditContact);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative border-b p-4">
        {showEditContact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 size-8"
            onClick={onEditContact}
            aria-label={
              editableContact
                ? VOICE_MESSAGES.editContactButton
                : VOICE_MESSAGES.deletePhoneHistoryTitle
            }
          >
            <PencilIcon className="size-4" />
          </Button>
        ) : null}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {VOICE_MESSAGES.callPhoneLabel}
        </p>
        <h2 className="truncate pr-10 text-xl font-semibold">{displayName}</h2>
        {phoneToCall ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {formatContactIdentifier(phoneToCall)}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {VOICE_MESSAGES.callHistoryTotalCalls}: {contactSummary.totalCalls}
          {" · "}
          {VOICE_MESSAGES.callHistoryTotalDuration}:{" "}
          {formatVoiceCallDuration(contactSummary.totalDurationSeconds)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b p-4">
        <QuickChip icon={HistoryIcon} label={VOICE_MESSAGES.callHistoryButton} onClick={onOpenHistory} />
        <QuickChip icon={VoicemailIcon} label={VOICE_MESSAGES.callRecordingTitle} onClick={onOpenRecordings} />
        <QuickChip icon={FileTextIcon} label={VOICE_MESSAGES.callTranscriptLive} onClick={onOpenTranscripts} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {recentCalls.length > 0 ? (
            <ul className="divide-y rounded-xl border">
              {recentCalls.map((item) => (
                <li key={item.id}>
                  <VoiceCallHistoryRow
                    call={item}
                    onClick={
                      onRecentCallSelect
                        ? () => onRecentCallSelect(item.id)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWorkspaceMessage text={VOICE_MESSAGES.callHistoryEmpty} />
          )}
        </div>

        <div
          className={cn(
            "mt-4 shrink-0 gap-3",
            showAddContact
              ? "grid grid-cols-3"
              : "mx-auto flex w-full max-w-sm justify-center",
          )}
        >
          <Button
            type="button"
            className={cn(
              "h-14 flex-col gap-1 bg-emerald-600 text-base hover:bg-emerald-700",
              !showAddContact && "min-w-[9.5rem] flex-1",
            )}
            disabled={!phoneToCall || callDisabled}
            onClick={onCall}
          >
            <PhoneIcon className="size-5" />
            {VOICE_MESSAGES.callOutbound}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-14 flex-col gap-1 text-base",
              !showAddContact && "min-w-[9.5rem] flex-1",
            )}
            disabled={!phoneToCall}
            onClick={onOpenSms}
          >
            <MessageSquareIcon className="size-5" />
            {VOICE_MESSAGES.callQuickActionsSms}
          </Button>
          {showAddContact ? (
            <Button
              type="button"
              variant="outline"
              className="h-14"
              onClick={onAddContact}
              aria-label={VOICE_MESSAGES.addContactButton}
            >
              <UserPlusIcon className="size-6" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isAiOnlyLiveCall(call: VoiceCallDetail): boolean {
  return call.aiHandled && !call.humanHandled;
}

function WorkspaceLiveView({
  call,
  onBack,
  onEndCall,
  onOpenTranscript,
}: {
  call: VoiceCallDetail;
  onBack: () => void;
  onEndCall: () => void;
  onOpenTranscript: () => void;
}) {
  const softphone = useVoiceSoftphone();
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const isOperatorCall = !isAiOnlyLiveCall(call);
  const { isRinging, isConnected, displaySeconds } = useLiveCallTimer(call, {
    status: softphone.status,
    activePhoneNumber: softphone.activePhoneNumber,
    callElapsedSeconds: softphone.callElapsedSeconds,
  });
  const { reconnect, stop, isListening } = useVoiceMonitorAudio({
    callLogId: call.id,
    enabled: false,
  });
  const [listening, setListening] = useState(false);
  const canMonitor =
    isAiOnlyLiveCall(call)
    && !isEphemeralLiveCallId(call.id)
    && call.id !== "softphone-live";
  const isLiveSession = isRinging || isConnected || softphone.status === "incoming";

  useEffect(() => {
    if (listening) {
      void reconnect();
      return;
    }
    stop();
  }, [listening, reconnect, stop]);

  useEffect(() => {
    if (!isAiOnlyLiveCall(call) || !isRinging) {
      return;
    }

    startOutboundRingback();
    return () => {
      stopOutboundRingback();
    };
  }, [call.aiHandled, call.humanHandled, isRinging]);

  const prevRingingRef = useRef(isRinging);
  useEffect(() => {
    const wasRinging = prevRingingRef.current;
    prevRingingRef.current = isRinging;

    if (
      isAiOnlyLiveCall(call)
      && wasRinging
      && !isRinging
      && !isConnected
    ) {
      playCallDisconnectedTone();
    }
  }, [call.aiHandled, call.humanHandled, isConnected, isRinging]);

  const handleBack = () => {
    if (isLiveSession) {
      return;
    }
    onBack();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopBar
        title={VOICE_MESSAGES.callLiveCardTitle}
        onBack={isLiveSession ? undefined : handleBack}
      />

      <div className="flex flex-1 flex-col p-4">
        <div className="rounded-2xl border bg-gradient-to-b from-red-50/80 to-background p-5 dark:from-red-950/20">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <ContactAvatar name={displayName} className="size-14" />
              {isRinging || isConnected ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-600" />
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {formatContactIdentifier(call.phoneNumber)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                  {VOICE_MESSAGES.callLiveBadge}
                </span>
                <span className={getVoiceCallStatusClassName(call.status)}>
                  {isRinging
                    ? VOICE_MESSAGES.callOutboundPending
                    : getVoiceCallStatusLabel(call.status)}
                </span>
                {isConnected && displaySeconds !== null ? (
                  <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatVoiceCallDuration(displaySeconds)}
                  </span>
                ) : isRinging ? (
                  <span className="text-amber-700 dark:text-amber-300">
                    {VOICE_MESSAGES.softphoneConnecting}
                  </span>
                ) : null}
                <span>
                  {call.aiHandled
                    ? VOICE_MESSAGES.callModeAiTitle
                    : VOICE_MESSAGES.callModeHumanTitle}
                </span>
              </div>
            </div>
          </div>

          {isOperatorCall ? (
            <WorkspaceOperatorInCallControls onEndCall={onEndCall} />
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {canMonitor ? (
                <Button
                  type="button"
                  variant={listening ? "default" : "outline"}
                  onClick={() => setListening((value) => !value)}
                >
                  <HeadphonesIcon className="mr-2 size-4" />
                  {listening
                    ? VOICE_MESSAGES.callMonitorAudioStop
                    : VOICE_MESSAGES.callListenLive}
                </Button>
              ) : null}
              {canMonitor ? (
                <Button type="button" variant="outline" onClick={onOpenTranscript}>
                  <FileTextIcon className="mr-2 size-4" />
                  {VOICE_MESSAGES.callTranscriptLive}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                onClick={onEndCall}
              >
                <PhoneOffIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.callEnd}
              </Button>
            </div>
          )}
        </div>

        {canMonitor && listening ? (
          <div className="mt-4 space-y-3">
            <VoiceMonitorWaveform active={isListening} />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setListening(false)}
              >
                <XIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.callMonitorAudioStop}
              </Button>
            </div>
          </div>
        ) : null}

        {isAiOnlyLiveCall(call) ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border p-4">
            <VoiceTranscriptTurns
              turns={call.turns}
              callTiming={{
                createdAt: call.createdAt,
                endedAt: call.endedAt,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceOperatorInCallControls({
  onEndCall,
}: {
  onEndCall: () => void;
}) {
  const softphone = useVoiceSoftphone();
  const isIncoming = softphone.status === "incoming";

  if (isIncoming) {
    return (
      <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3">
        <Button
          type="button"
          size="lg"
          className="rounded-full"
          onClick={softphone.acceptIncoming}
        >
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
    <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2">
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
        onClick={onEndCall}
        aria-label={VOICE_MESSAGES.callEnd}
      >
        <PhoneOffIcon className="size-5" />
      </Button>
    </div>
  );
}

function WorkspaceTranscriptView({
  call,
  onClose,
}: {
  call: VoiceCallDetail;
  onClose: () => void;
}) {
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const { dateLabel, timeLabel } = formatVoiceCallDateParts(call.createdAt, {
    local: true,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatContactIdentifier(call.phoneNumber)}
            {" · "}
            {dateLabel} {timeLabel}
          </p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <VoiceTranscriptTurns
          turns={call.turns}
          callTiming={{
            createdAt: call.createdAt,
            endedAt: call.endedAt,
          }}
        />
      </div>
    </div>
  );
}

function WorkspaceListShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopBar title={title} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function WorkspaceTopBar({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      {onBack ? (
        <Button type="button" size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="size-4" />
        </Button>
      ) : (
        <span className="size-9 shrink-0" aria-hidden />
      )}
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

function CallRows({
  calls,
  onSelect,
}: {
  calls: VoiceInboxCallListItem[];
  onSelect?: (callId: string) => void;
}) {
  if (calls.length === 0) {
    return <EmptyWorkspaceMessage text={VOICE_MESSAGES.callHistoryEmpty} />;
  }

  return (
    <ul className="divide-y">
      {calls.map((item) => (
        <li key={item.id}>
          <VoiceCallHistoryRow
            call={item}
            onClick={onSelect ? () => onSelect(item.id) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

function QuickChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof HistoryIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border bg-background px-2 py-2 text-xs font-medium transition-colors hover:bg-muted/40"
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function EmptyWorkspaceMessage({ text }: { text: string }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>
  );
}
