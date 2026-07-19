"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  Grid3x3Icon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { useVoiceCallsRealtime } from "@/hooks/use-voice-calls-realtime";
import type { VoiceCallDetail, VoiceInboxCallListItem, VoiceInboxPageData } from "@/types/voice-inbox.types";
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
  calls: initialCalls = [],
  activeCall: initialActiveCall = null,
}: VoiceCallsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCallId = searchParams.get("call")?.trim() || null;
  const phoneDraft = searchParams.get("phone")?.trim() || "";
  const dialOpen = searchParams.get("dial") === "1";

  const [calls, setCalls] = useState(initialCalls);
  const [activeCallDetail, setActiveCallDetail] = useState<VoiceCallDetail | null>(
    initialActiveCall,
  );
  const [callFilter, setCallFilter] = useState<VoiceCallFilter>("all");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactPhone, setAddContactPhone] = useState("");
  const [workspaceView, setWorkspaceView] = useState<VoiceWorkspaceView>({
    mode: "home",
  });
  const [phonebookContacts, setPhonebookContacts] = useState<PhoneContactListItem[]>([]);
  const { detailsOpen } = useInboxLayout();
  const notifiedInboundCallsRef = useRef(new Set<string>());

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
            router.push(`${DASHBOARD_ROUTES.voice}?call=${call.id}`);
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
  const workspaceAllCalls = useMemo(() => {
    return enrichVoiceCallsWithPhonebook(
      filterVoiceCalls(calls, callFilter),
      phonebookContacts,
    );
  }, [callFilter, calls, phonebookContacts]);
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
        return activeCallDetail?.id === activeCallId ? activeCallDetail : null;
      }

      const phonebookMatch = phonebookContacts.find((contact) =>
        phonesMatch(contact.phoneNumber, listItem.phoneNumber),
      );

      const sameDetail = activeCallDetail?.id === listItem.id;

      return {
        ...listItem,
        contactName: listItem.contactName ?? phonebookMatch?.name ?? null,
        contactId: listItem.contactId ?? phonebookMatch?.id ?? null,
        turns: sameDetail ? (activeCallDetail?.turns ?? []) : [],
        turnCount: sameDetail ? (activeCallDetail?.turnCount ?? 0) : 0,
        hasRecording: Boolean(
          listItem.recordingUrl?.trim()
          || (sameDetail && activeCallDetail?.hasRecording),
        ),
        events: sameDetail ? (activeCallDetail?.events ?? []) : [],
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
    if (dialOpen && !activeCallId && !phoneDraft) {
      setWorkspaceView({ mode: "dialpad" });
      return;
    }

    if (!activeCallId && !phoneDraft) {
      setWorkspaceView((current) => {
        if (
          ["history", "recordings", "transcripts", "transcript", "live"].includes(
            current.mode,
          )
        ) {
          return current;
        }
        return { mode: "home" };
      });
      return;
    }

    if (phoneDraft && !activeCallId) {
      setWorkspaceView((current) => {
        if (
          ["history", "recordings", "transcripts", "transcript", "live"].includes(
            current.mode,
          )
        ) {
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
      if (
        ["history", "recordings", "transcripts", "transcript"].includes(
          current.mode,
        )
      ) {
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
  }, [activeCallId, calls, dialOpen, phoneDraft]);

  const handlePrepareNewCall = useCallback(() => {
    setActiveCallDetail((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        turns: [],
        turnCount: 0,
        events: [],
      };
    });
  }, []);

  const handleOpenDialpad = useCallback(() => {
    setWorkspaceView({ mode: "dialpad" });
    router.push(`${DASHBOARD_ROUTES.voice}?dial=1`);
  }, [router]);

  const handleWorkspaceViewChange = useCallback((view: VoiceWorkspaceView) => {
    setWorkspaceView(view);
  }, []);

  const handleCallSelect = useCallback(
    (callId: string) => {
      const selected = calls.find((item) => item.id === callId);
      router.push(`${DASHBOARD_ROUTES.voice}?call=${callId}`);
      if (selected && isActiveVoiceCallStatus(selected.status)) {
        setWorkspaceView({ mode: "live", callId });
      } else {
        setWorkspaceView({ mode: "home" });
      }
    },
    [calls, router],
  );

  const handleBackToList = useCallback(() => {
    setWorkspaceView({ mode: "home" });
    router.push(DASHBOARD_ROUTES.voice);
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
        `${DASHBOARD_ROUTES.voice}?phone=${encodeURIComponent(contact.phoneNumber)}`,
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
          `${DASHBOARD_ROUTES.voice}?phone=${encodeURIComponent(input.phoneNumber)}`,
        );
      }
    },
    [activeCallId, phoneDraft, refreshPhonebookContacts, router],
  );

  const handleContactDeleted = useCallback(
    (_contactId: string) => {
      refreshPhonebookContacts();
      setWorkspaceView({ mode: "dialpad" });
      router.push(DASHBOARD_ROUTES.voice);
      router.refresh();
    },
    [refreshPhonebookContacts, router],
  );

  const handlePhoneHistoryDeleted = useCallback(
    (_phoneNumber: string) => {
      refreshPhonebookContacts();
      setWorkspaceView({ mode: "dialpad" });
      router.push(DASHBOARD_ROUTES.voice);
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

  const showDetailOnMobile = Boolean(activeCallId || phoneDraft || dialOpen);
  const showSubPageBack =
    showDetailOnMobile &&
    (workspaceView.mode === "history" ||
      workspaceView.mode === "recordings" ||
      workspaceView.mode === "transcripts" ||
      workspaceView.mode === "transcript");

  return (
    <>
      <InboxShell
        showChatOnMobile={showDetailOnMobile}
        showRightColumn={showRightPanel}
        listColumn={
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <h1 className="text-lg font-semibold lg:text-xl">
                  {VOICE_MESSAGES.inboxTabLabel}
                </h1>
                <div className="hidden lg:block">
                  <VoiceInboxToolbar
                    showDialpadToggle={
                      hasNumberSelected && workspaceView.mode === "home"
                    }
                    dialpadOpen={workspaceView.mode === "dialpad"}
                    onOpenDialpad={handleOpenDialpad}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 shrink-0 lg:hidden"
                  aria-label={VOICE_MESSAGES.dialpadTitle}
                  onClick={handleOpenDialpad}
                >
                  <Grid3x3Icon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setContactsOpen(true)}
                  className="px-2.5 sm:px-3"
                >
                  <UserIcon className="size-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {VOICE_MESSAGES.contactsButton}
                  </span>
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
              <div className="flex shrink-0 items-center gap-1 border-b px-2 py-2 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    if (showSubPageBack) {
                      setWorkspaceView({ mode: "home" });
                      return;
                    }
                    handleBackToList();
                  }}
                >
                  <ArrowLeftIcon className="size-4" />
                  {showSubPageBack
                    ? VOICE_MESSAGES.callPhoneLabel
                    : VOICE_MESSAGES.inboxTabLabel}
                </Button>
                {workspaceView.mode === "home" ||
                workspaceView.mode === "dialpad" ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="ml-auto size-8"
                    aria-label={VOICE_MESSAGES.dialpadTitle}
                    onClick={handleOpenDialpad}
                  >
                    <Grid3x3Icon className="size-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            <VoiceWorkspacePanel
              view={workspaceView}
              onViewChange={handleWorkspaceViewChange}
              call={selectedCall}
              allCalls={workspaceAllCalls}
              activeCallId={activeCallId}
              initialPhone={phoneDraft}
              phonebookContacts={phonebookContacts}
              onSelectCall={handleCallSelect}
              onPrepareNewCall={handlePrepareNewCall}
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
