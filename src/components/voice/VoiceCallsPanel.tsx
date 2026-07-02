"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import {
  InboxLayoutProvider,
  useInboxLayout,
} from "@/components/chats/inbox/inbox-layout-context";
import { VoiceAddContactDialog } from "@/components/voice/VoiceAddContactDialog";
import {
  findFirstActiveAiVoiceCall,
  VoiceActiveAiCallChip,
} from "@/components/voice/VoiceActiveCallBanner";
import { VoiceContactsDialog } from "@/components/voice/VoiceContactsDialog";
import { VoiceInboxDetailsPanel } from "@/components/voice/VoiceInboxDetailsPanel";
import { VoiceInboxToolbar } from "@/components/voice/VoiceInboxToolbar";
import { VoiceWorkspacePanel } from "@/components/voice/workspace/VoiceWorkspacePanel";
import type { VoiceWorkspaceView } from "@/components/voice/workspace/voice-workspace.types";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { VoiceCallFilters } from "@/components/voice/VoiceCallFilters";
import { VoiceCallList } from "@/components/voice/VoiceCallList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { listPhoneContactsAction } from "@/features/voice/actions/phone-contact";
import { fetchVoiceCallsAction } from "@/features/voice/actions/fetch-voice-calls";
import { useVoiceCallsRealtime } from "@/hooks/use-voice-calls-realtime";
import type { VoiceCallDetail, VoiceInboxCallListItem, VoiceInboxPageData } from "@/types/voice-inbox.types";
import type { MessagingChannel } from "@/types/database.types";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import {
  filterVoiceCalls,
  isActiveVoiceCallStatus,
  type VoiceCallFilter,
} from "@/utils/voice-call-display";
import {
  dedupeVoiceCallsByContact,
  enrichVoiceCallsWithPhonebook,
  getVoiceCallListKey,
  phonesMatch,
} from "@/utils/voice-contact-calls";

type VoiceCallsPanelProps = Partial<VoiceInboxPageData>;

export function VoiceCallsPanel(props: VoiceCallsPanelProps) {
  return (
    <InboxLayoutProvider>
      <Suspense fallback={<VoiceCallsPanelFallback />}>
        <VoiceCallsPanelContent {...props} />
      </Suspense>
    </InboxLayoutProvider>
  );
}

function VoiceCallsPanelFallback() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
      {VOICE_MESSAGES.inboxLoading}
    </div>
  );
}

function VoiceCallsPanelContent({
  hasBusiness = true,
  businessId = null,
  voiceInboxEnabled = false,
  smsInboxEnabled = false,
  visibleChannelIds = [] as MessagingChannel[],
  calls: initialCalls = [],
  activeCall: initialActiveCall = null,
}: VoiceCallsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCallId = searchParams.get("call")?.trim() || null;
  const phoneDraft = searchParams.get("phone")?.trim() || "";

  const [calls, setCalls] = useState(initialCalls);
  const [activeCallDetail, setActiveCallDetail] = useState<VoiceCallDetail | null>(
    initialActiveCall,
  );
  const [callFilter, setCallFilter] = useState<VoiceCallFilter>("all");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactPhone, setAddContactPhone] = useState("");
  const [workspaceView, setWorkspaceView] = useState<VoiceWorkspaceView>({ mode: "dialpad" });
  const [phonebookContacts, setPhonebookContacts] = useState<PhoneContactListItem[]>([]);
  const { detailsOpen } = useInboxLayout();
  const softphone = useVoiceSoftphone();
  const notifiedInboundCallsRef = useRef(new Set<string>());
  const prevSoftphoneStatusRef = useRef(softphone.status);

  useEffect(() => {
    setCalls(initialCalls);
  }, [initialCalls]);

  useEffect(() => {
    setActiveCallDetail(initialActiveCall);
  }, [initialActiveCall]);

  const handleNewCall = useCallback(
    (call: VoiceInboxCallListItem) => {
      if (call.direction !== "inbound") {
        return;
      }

      if (notifiedInboundCallsRef.current.has(call.id)) {
        return;
      }

      notifiedInboundCallsRef.current.add(call.id);

      toast.info(VOICE_MESSAGES.inboundCallReceived, {
        description: call.contactName ?? call.phoneNumber,
        action: {
          label: VOICE_MESSAGES.inboundCallOpen,
          onClick: () => {
            router.push(`${DASHBOARD_ROUTES.chatsVoice}?call=${call.id}`);
          },
        },
      });
    },
    [router],
  );

  useVoiceCallsRealtime({
    enabled: voiceInboxEnabled && Boolean(businessId),
    businessId,
    activeCallId,
    onCallsChange: setCalls,
    onActiveCallChange: setActiveCallDetail,
    onNewCall: handleNewCall,
  });

  const refreshPhonebookContacts = useCallback(() => {
    void listPhoneContactsAction("phonebook").then(setPhonebookContacts);
  }, []);

  useEffect(() => {
    if (!voiceInboxEnabled) {
      return;
    }

    refreshPhonebookContacts();
  }, [refreshPhonebookContacts, voiceInboxEnabled]);

  const filteredCalls = useMemo(() => filterVoiceCalls(calls, callFilter), [callFilter, calls]);
  const listCalls = useMemo(() => {
    const deduped = dedupeVoiceCallsByContact(filteredCalls);
    return enrichVoiceCallsWithPhonebook(deduped, phonebookContacts);
  }, [filteredCalls, phonebookContacts]);
  const activeContactKey = useMemo(() => {
    const active = calls.find((call) => call.id === activeCallId);
    return active ? getVoiceCallListKey(active) : null;
  }, [activeCallId, calls]);

  const selectedCall = useMemo(() => {
    if (activeCallId) {
      if (activeCallDetail?.id === activeCallId) {
        return activeCallDetail;
      }

      const listItem = calls.find((call) => call.id === activeCallId);

      if (!listItem) {
        return activeCallDetail;
      }

      const phonebookMatch = phonebookContacts.find((contact) =>
        phonesMatch(contact.phoneNumber, listItem.phoneNumber),
      );

      return {
        ...listItem,
        contactName: listItem.contactName ?? phonebookMatch?.name ?? null,
        contactId: listItem.contactId ?? phonebookMatch?.id ?? null,
        turns: activeCallDetail?.turns ?? [],
        turnCount: activeCallDetail?.turnCount ?? 0,
        hasRecording: Boolean(
          listItem.recordingUrl?.trim() || activeCallDetail?.hasRecording,
        ),
        events: activeCallDetail?.events ?? [],
      };
    }

    return null;
  }, [activeCallDetail, activeCallId, calls, phonebookContacts]);

  const detailsConversationId = selectedCall?.conversationId ?? null;
  const showRightPanel = detailsOpen && Boolean(detailsConversationId);
  const liveCall = useMemo(() => findFirstActiveAiVoiceCall(calls), [calls]);
  const activeLiveCallIds = useMemo(
    () =>
      new Set(
        calls
          .filter((call) => isActiveVoiceCallStatus(call.status))
          .map((call) => call.id),
      ),
    [calls],
  );
  const hasNumberSelected = Boolean(activeCallId || phoneDraft);

  useEffect(() => {
    const previous = prevSoftphoneStatusRef.current;
    prevSoftphoneStatusRef.current = softphone.status;

    const wasOperatorSession =
      previous === "connecting" || previous === "on-call";
    const isIdle = softphone.status === "ready" || softphone.status === "offline";

    if (!wasOperatorSession || !isIdle) {
      return;
    }

    setCalls((current) =>
      current.map((call) =>
        isActiveVoiceCallStatus(call.status) && call.callMode === "human"
          ? {
              ...call,
              status: "canceled",
              endedAt: new Date().toISOString(),
            }
          : call,
      ),
    );

    void fetchVoiceCallsAction().then((result) => {
      if (result.success) {
        setCalls(result.data);
      }
    });
    router.refresh();
  }, [router, softphone.status]);

  useEffect(() => {
    if (!activeCallId && !phoneDraft) {
      setWorkspaceView((current) => {
        if (["history", "recordings", "transcripts", "transcript", "live"].includes(current.mode)) {
          return current;
        }
        return { mode: "dialpad" };
      });
      return;
    }

    if (phoneDraft && !activeCallId) {
      setWorkspaceView((current) => {
        if (["history", "recordings", "transcripts", "transcript", "live"].includes(current.mode)) {
          return current;
        }
        if (current.mode === "dialpad") {
          return current;
        }
        return { mode: "home" };
      });
      return;
    }

    if (!activeCallId) {
      return;
    }

    const listCall = calls.find((item) => item.id === activeCallId);
    if (!listCall) {
      return;
    }

    setWorkspaceView((current) => {
      if (["history", "recordings", "transcripts", "transcript"].includes(current.mode)) {
        return current;
      }

      if (current.mode === "live") {
        return current;
      }

      if (isActiveVoiceCallStatus(listCall.status)) {
        return { mode: "live", callId: activeCallId };
      }

      return { mode: "home" };
    });
  }, [activeCallId, calls, phoneDraft]);

  const handleOpenDialpad = useCallback(() => {
    setWorkspaceView({ mode: "dialpad" });
  }, []);

  const handleWorkspaceViewChange = useCallback((view: VoiceWorkspaceView) => {
    setWorkspaceView(view);
  }, []);

  const handleCallSelect = useCallback(
    (callId: string) => {
      const selected = calls.find((item) => item.id === callId);
      router.push(`${DASHBOARD_ROUTES.chatsVoice}?call=${callId}`);
      if (selected && isActiveVoiceCallStatus(selected.status)) {
        setWorkspaceView({ mode: "live", callId });
      } else {
        setWorkspaceView({ mode: "home" });
      }
    },
    [calls, router],
  );

  const handleBackToList = useCallback(() => {
    router.push(DASHBOARD_ROUTES.chatsVoice);
  }, [router]);

  const handleOpenSms = useCallback(
    (phoneNumber: string, conversationId?: string | null) => {
      if (conversationId) {
        router.push(`${DASHBOARD_ROUTES.chatsSms}?conversation=${conversationId}`);
        return;
      }

      router.push(`${DASHBOARD_ROUTES.chatsSms}?phone=${encodeURIComponent(phoneNumber)}`);
    },
    [router],
  );

  const handleContactSelect = useCallback(
    (contact: PhoneContactListItem) => {
      setWorkspaceView({ mode: "home" });
      router.push(
        `${DASHBOARD_ROUTES.chatsVoice}?phone=${encodeURIComponent(contact.phoneNumber)}`,
      );
    },
    [router],
  );

  const handleAddContact = useCallback((phoneNumber: string) => {
    setAddContactPhone(phoneNumber);
    setAddContactOpen(true);
  }, []);

  const handleContactUpdated = useCallback(
    (input: { contactId: string; phoneNumber: string; name: string }) => {
      refreshPhonebookContacts();
      router.refresh();

      if (!activeCallId && phoneDraft) {
        router.push(
          `${DASHBOARD_ROUTES.chatsVoice}?phone=${encodeURIComponent(input.phoneNumber)}`,
        );
      }
    },
    [activeCallId, phoneDraft, refreshPhonebookContacts, router],
  );

  const handleContactDeleted = useCallback(
    (_contactId: string) => {
      refreshPhonebookContacts();
      setWorkspaceView({ mode: "dialpad" });
      router.push(DASHBOARD_ROUTES.chatsVoice);
      router.refresh();
    },
    [refreshPhonebookContacts, router],
  );

  const handlePhoneHistoryDeleted = useCallback(
    (_phoneNumber: string) => {
      refreshPhonebookContacts();
      setWorkspaceView({ mode: "dialpad" });
      router.push(DASHBOARD_ROUTES.chatsVoice);
      router.refresh();
    },
    [refreshPhonebookContacts, router],
  );

  if (!hasBusiness) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{CHAT_MESSAGES.noBusinessTitle}</CardTitle>
            <CardDescription>{CHAT_MESSAGES.noBusinessDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.onboarding}>Start setup wizard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!voiceInboxEnabled) {
    return (
      <InboxShell
        channelTabs={
          <InboxChannelTabs
            activeChannel="voice"
            visibleChannelIds={visibleChannelIds}
            voiceInboxEnabled={false}
            smsInboxEnabled={smsInboxEnabled}
          />
        }
        listColumn={
          <div className="flex h-full items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-none">
              <CardHeader>
                <CardTitle>{VOICE_MESSAGES.inboxNotConnectedTitle}</CardTitle>
                <CardDescription>
                  {VOICE_MESSAGES.inboxNotConnectedDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`${DASHBOARD_ROUTES.integrations}/voice`}>
                    {VOICE_MESSAGES.inboxOpenIntegrations}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        }
        chatColumn={
          <VoiceWorkspacePanel
            view={{ mode: "dialpad" }}
            onViewChange={() => {}}
            call={null}
            allCalls={[]}
            initialPhone={phoneDraft}
          />
        }
        detailsColumn={null}
      />
    );
  }

  const showDetailOnMobile = true;

  return (
    <>
      <InboxShell
        showChatOnMobile={showDetailOnMobile}
        showRightColumn={showRightPanel}
        channelTabs={
          <InboxChannelTabs
            activeChannel="voice"
            visibleChannelIds={visibleChannelIds}
            voiceInboxEnabled
            smsInboxEnabled={smsInboxEnabled}
          />
        }
        listColumn={
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <h1 className="text-xl font-semibold">{VOICE_MESSAGES.inboxTabLabel}</h1>
                <VoiceInboxToolbar
                  showDialpadToggle={hasNumberSelected && workspaceView.mode === "home"}
                  dialpadOpen={workspaceView.mode === "dialpad"}
                  onOpenDialpad={handleOpenDialpad}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setContactsOpen(true)}
                >
                  <UserIcon className="mr-2 size-4" />
                  {VOICE_MESSAGES.contactsButton}
                </Button>
              </div>
            </div>
            {liveCall ? <VoiceActiveAiCallChip call={liveCall} /> : null}
            <VoiceCallFilters value={callFilter} onChange={setCallFilter} />
            <VoiceCallList
              calls={listCalls}
              activeCallId={activeCallId}
              activeContactKey={activeContactKey}
              activeLiveCallIds={activeLiveCallIds}
              onCallSelect={handleCallSelect}
            />
          </div>
        }
        chatColumn={
          <div className="flex h-full min-h-0 flex-col">
            {showDetailOnMobile ? (
              <div className="shrink-0 border-b px-3 py-2 lg:hidden">
                <Button variant="ghost" size="sm" type="button" onClick={handleBackToList}>
                  <ArrowLeftIcon className="size-4" />
                  {VOICE_MESSAGES.inboxTabLabel}
                </Button>
              </div>
            ) : null}
            <VoiceWorkspacePanel
              view={workspaceView}
              onViewChange={handleWorkspaceViewChange}
              call={selectedCall}
              allCalls={calls}
              activeCallId={activeCallId}
              initialPhone={phoneDraft}
              phonebookContacts={phonebookContacts}
              onSelectCall={handleCallSelect}
              onOpenSms={handleOpenSms}
              onAddContact={handleAddContact}
              onContactUpdated={handleContactUpdated}
              onContactDeleted={handleContactDeleted}
              onPhoneHistoryDeleted={handlePhoneHistoryDeleted}
              onRecordingDeleted={() => router.refresh()}
            />
          </div>
        }
        detailsColumn={
          <VoiceInboxDetailsPanel conversationId={detailsConversationId} />
        }
      />

      <VoiceContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onSelectContact={handleContactSelect}
        contactScope="phonebook"
        onContactsChange={refreshPhonebookContacts}
      />

      <VoiceAddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        phoneNumber={addContactPhone}
        onContactCreated={() => {
          refreshPhonebookContacts();
          router.refresh();
        }}
      />
    </>
  );
}
