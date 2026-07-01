"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  UserIcon,
} from "lucide-react";

import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import {
  InboxLayoutProvider,
  useInboxLayout,
} from "@/components/chats/inbox/inbox-layout-context";
import { VoiceAddContactDialog } from "@/components/voice/VoiceAddContactDialog";
import { VoiceContactsDialog } from "@/components/voice/VoiceContactsDialog";
import { VoiceInboxDetailsPanel } from "@/components/voice/VoiceInboxDetailsPanel";
import { VoiceInboxDialerPanel } from "@/components/voice/VoiceInboxDialerPanel";
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
import { useVoiceCallsRealtime } from "@/hooks/use-voice-calls-realtime";
import type { VoiceCallDetail, VoiceInboxPageData } from "@/types/voice-inbox.types";
import type { MessagingChannel } from "@/types/database.types";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import {
  filterVoiceCalls,
  type VoiceCallFilter,
} from "@/utils/voice-call-display";

type VoiceCallsPanelProps = Partial<VoiceInboxPageData>;

export function VoiceCallsPanel(props: VoiceCallsPanelProps) {
  return (
    <InboxLayoutProvider>
      <VoiceCallsPanelContent {...props} />
    </InboxLayoutProvider>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactPhone, setAddContactPhone] = useState("");
  const { detailsOpen, toggleDetails } = useInboxLayout();

  useEffect(() => {
    setCalls(initialCalls);
  }, [initialCalls]);

  useEffect(() => {
    setActiveCallDetail(initialActiveCall);
  }, [initialActiveCall]);

  useVoiceCallsRealtime({
    enabled: voiceInboxEnabled && Boolean(businessId),
    businessId,
    activeCallId,
    onCallsChange: setCalls,
    onActiveCallChange: setActiveCallDetail,
  });

  const filteredCalls = useMemo(() => {
    const byFilter = filterVoiceCalls(calls, callFilter);
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return byFilter;
    }

    return byFilter.filter((call) => {
      const name = call.contactName?.toLowerCase() ?? "";
      const phone = call.phoneNumber.toLowerCase();

      return name.includes(query) || phone.includes(query);
    });
  }, [callFilter, calls, searchQuery]);

  const selectedCall = useMemo(() => {
    if (activeCallId) {
      if (activeCallDetail?.id === activeCallId) {
        return activeCallDetail;
      }

      const listItem = calls.find((call) => call.id === activeCallId);

      if (!listItem) {
        return activeCallDetail;
      }

      return {
        ...listItem,
        turns: activeCallDetail?.turns ?? [],
        turnCount: activeCallDetail?.turnCount ?? 0,
        hasRecording: Boolean(
          listItem.recordingUrl?.trim() || activeCallDetail?.hasRecording,
        ),
        events: activeCallDetail?.events ?? [],
      };
    }

    return null;
  }, [activeCallDetail, activeCallId, calls]);

  const detailsConversationId = selectedCall?.conversationId ?? null;
  const showRightPanel = detailsOpen && Boolean(detailsConversationId);

  const handleCallSelect = useCallback(
    (callId: string) => {
      router.push(`${DASHBOARD_ROUTES.chatsVoice}?call=${callId}`);
    },
    [router],
  );

  const handleBackToList = useCallback(() => {
    router.push(DASHBOARD_ROUTES.chatsVoice);
  }, [router]);

  const handleSelectionClear = useCallback(() => {
    if (activeCallId) {
      router.push(phoneDraft ? `${DASHBOARD_ROUTES.chatsVoice}?phone=${encodeURIComponent(phoneDraft)}` : DASHBOARD_ROUTES.chatsVoice);
    }
  }, [activeCallId, phoneDraft, router]);

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
          <VoiceInboxDialerPanel
            call={null}
            searchQuery=""
            onSearchQueryChange={() => {}}
            initialPhone={phoneDraft}
          />
        }
        detailsColumn={null}
      />
    );
  }

  const showDetailOnMobile = Boolean(activeCallId || phoneDraft);

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
              <h1 className="text-xl font-semibold">{VOICE_MESSAGES.inboxTabLabel}</h1>
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
            <VoiceCallFilters value={callFilter} onChange={setCallFilter} />
            <VoiceCallList
              calls={filteredCalls}
              activeCallId={activeCallId}
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
            <VoiceInboxDialerPanel
              call={selectedCall}
              allCalls={calls}
              activeCallId={activeCallId}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectionClear={handleSelectionClear}
              onSelectCall={handleCallSelect}
              initialPhone={phoneDraft}
              onOpenSms={handleOpenSms}
              onAddContact={handleAddContact}
              detailsOpen={detailsOpen}
              onToggleDetails={toggleDetails}
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
      />

      <VoiceAddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        phoneNumber={addContactPhone}
        onContactCreated={() => {
          router.refresh();
        }}
      />
    </>
  );
}
