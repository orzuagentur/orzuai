"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  UserIcon,
} from "lucide-react";

import { ChatList } from "@/components/chats/ChatList";
import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import { useInboxLayout, InboxLayoutProvider } from "@/components/chats/inbox/inbox-layout-context";
import { SmsThreadPanel } from "@/components/sms/SmsThreadPanel";
import { VoiceAddContactDialog } from "@/components/voice/VoiceAddContactDialog";
import { VoiceContactsDialog } from "@/components/voice/VoiceContactsDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { INBOX_PAGE_SIZE } from "@/features/chats/constants";
import { CHAT_MESSAGES } from "@/features/chats";
import { SMS_MESSAGES } from "@/features/sms/constants";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  useInboxPanel,
  useSkipInitialListFetch,
} from "@/hooks/use-inbox-panel";
import type { ConversationListItem } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import type { SmsInboxPageData } from "@/services/sms-inbox.service";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import { phoneDigits } from "@/utils/voice-contact-calls";

type SmsInboxPanelProps = Partial<SmsInboxPageData>;

export function SmsInboxPanel(props: SmsInboxPanelProps) {
  return (
    <InboxLayoutProvider>
      <SmsInboxPanelContent {...props} />
    </InboxLayoutProvider>
  );
}

function SmsInboxPanelContent({
  hasBusiness = true,
  businessId = null,
  smsInboxEnabled = false,
  voiceInboxEnabled = false,
  visibleChannelIds = [] as MessagingChannel[],
  conversations: initialConversations = [],
  activeConversation: initialActiveConversation = null,
}: SmsInboxPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation")?.trim() || null;
  const phoneDraft = searchParams.get("phone")?.trim() || "";

  const [conversations, setConversations] = useState(initialConversations);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const { detailsOpen, toggleDetails } = useInboxLayout();
  const [, startFetching] = useTransition();
  const { consumeSkipInitialFetch } = useSkipInitialListFetch();
  const refreshConversationsRef = useRef<() => void>(() => {});
  const preserveListReadStateRef = useRef<
    (items: ConversationListItem[]) => ConversationListItem[]
  >((items) => items);

  const fetchConversations = useCallback((silent = false) => {
    const run = async () => {
      const result = await fetchMonitorConversationsAction({
        channel: "voice",
        offset: 0,
        limit: INBOX_PAGE_SIZE,
        view: "all",
        filter: "all",
        sort: "latest",
      });

      if (result.success) {
        setConversations(preserveListReadStateRef.current(result.data.items));
      }
    };

    if (silent) {
      void run();
      return;
    }

    startFetching(run);
  }, []);

  const refreshConversations = useCallback(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  refreshConversationsRef.current = refreshConversations;

  const {
    selectedConversationId,
    conversation: activeConversation,
    isLoadingConversation,
    appendMessage,
    removeMessage,
    handleConversationSelect: selectConversation,
    handleConversationViewed,
    handleReadProgress,
    preserveListReadState,
    realtimeConnected,
  } = useInboxPanel({
    initialConversationId,
    initialActiveConversation: initialActiveConversation,
    initialChannelConnected: smsInboxEnabled,
    initialAiEnabled: null,
    initialCannedResponses: [],
    hasBusiness,
    businessId,
    isInitialLoading: false,
    channelFilter: "voice",
    hasActiveListFilters: false,
    onConversationsChange: setConversations,
    onRefreshConversations: () => refreshConversationsRef.current(),
  });

  useEffect(() => {
    preserveListReadStateRef.current = preserveListReadState;
  }, [preserveListReadState]);

  useEffect(() => {
    setConversations(preserveListReadStateRef.current(initialConversations));
  }, [initialConversations]);

  useEffect(() => {
    if (consumeSkipInitialFetch()) {
      return;
    }

    fetchConversations();
  }, [consumeSkipInitialFetch, fetchConversations]);

  const handleConversationSelect = useCallback(
    (id: string | null) => {
      selectConversation(id);

      if (!id) {
        router.push(phoneDraft ? `${DASHBOARD_ROUTES.chatsSms}?phone=${encodeURIComponent(phoneDraft)}` : DASHBOARD_ROUTES.chatsSms);
        return;
      }

      router.push(`${DASHBOARD_ROUTES.chatsSms}?conversation=${id}`);
    },
    [phoneDraft, router, selectConversation],
  );

  const handleContactSelect = useCallback(
    (contact: PhoneContactListItem) => {
      const existing = conversations.find(
        (item) =>
          item.contactId === contact.id ||
          phoneDigits(item.contactPhone) === phoneDigits(contact.phoneNumber),
      );

      if (existing) {
        handleConversationSelect(existing.id);
        return;
      }

      router.push(
        `${DASHBOARD_ROUTES.chatsSms}?phone=${encodeURIComponent(contact.phoneNumber)}`,
      );
    },
    [conversations, handleConversationSelect, router],
  );

  const handleSentToNewNumber = useCallback(
    async (phoneNumber: string) => {
      const result = await fetchMonitorConversationsAction({
        channel: "voice",
        offset: 0,
        limit: INBOX_PAGE_SIZE,
        view: "all",
        filter: "all",
        sort: "latest",
      });

      if (!result.success) {
        return;
      }

      const items = preserveListReadStateRef.current(result.data.items);
      setConversations(items);

      const match = items.find(
        (item) => phoneDigits(item.contactPhone) === phoneDigits(phoneNumber),
      );

      if (match) {
        handleConversationSelect(match.id);
      }
    },
    [handleConversationSelect],
  );

  const showThread = Boolean(selectedConversationId || phoneDraft);
  const headerActions = (
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
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="hidden size-8 xl:inline-flex"
        onClick={toggleDetails}
        aria-label={VOICE_MESSAGES.detailsPanelToggle}
      >
        {detailsOpen ? (
          <PanelRightCloseIcon className="size-4" />
        ) : (
          <PanelRightOpenIcon className="size-4" />
        )}
      </Button>
    </div>
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

  if (!smsInboxEnabled) {
    return (
      <InboxShell
        channelTabs={
          <InboxChannelTabs
            activeChannel="sms"
            visibleChannelIds={visibleChannelIds}
            voiceInboxEnabled={voiceInboxEnabled}
            smsInboxEnabled={false}
          />
        }
        listColumn={
          <div className="flex h-full items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-none">
              <CardHeader>
                <CardTitle>{SMS_MESSAGES.inboxNotConnectedTitle}</CardTitle>
                <CardDescription>{SMS_MESSAGES.inboxNotConnectedDescription}</CardDescription>
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
        chatColumn={<SmsThreadPanel conversation={null} />}
        detailsColumn={null}
      />
    );
  }

  return (
    <>
      <InboxShell
        showChatOnMobile={showThread}
        showRightColumn={detailsOpen && Boolean(activeConversation)}
        channelTabs={
          <InboxChannelTabs
            activeChannel="sms"
            visibleChannelIds={visibleChannelIds}
            voiceInboxEnabled={voiceInboxEnabled}
            smsInboxEnabled
          />
        }
        listColumn={
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold">{SMS_MESSAGES.inboxTabLabel}</h1>
                {realtimeConnected ? (
                  <p className="text-xs text-muted-foreground">Live</p>
                ) : null}
              </div>
              {headerActions}
            </div>
            <div className="min-h-0 flex-1">
              <ChatList
                className="h-full"
                conversations={conversations}
                activeConversationId={selectedConversationId}
                channelId="voice"
                hideChannelBadge
                onConversationSelect={handleConversationSelect}
                variant="inbox"
              />
            </div>
          </div>
        }
        chatColumn={
          <div className="flex h-full min-h-0 flex-col">
            {showThread ? (
              <div className="shrink-0 border-b px-3 py-2 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => handleConversationSelect(null)}
                >
                  <ArrowLeftIcon className="size-4" />
                  {SMS_MESSAGES.inboxTabLabel}
                </Button>
              </div>
            ) : null}
            <SmsThreadPanel
              conversation={activeConversation}
              draftPhone={phoneDraft}
              isLoadingConversation={isLoadingConversation}
              onBack={() => handleConversationSelect(null)}
              onOptimisticMessage={appendMessage}
              onClearPendingMessage={removeMessage}
              onSendFailed={removeMessage}
              onConversationViewed={handleConversationViewed}
              onReadProgress={handleReadProgress}
              onSentToNewNumber={(phoneNumber) => {
                void handleSentToNewNumber(phoneNumber);
              }}
            />
            {phoneDraft && !activeConversation ? (
              <div className="border-t px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddContactOpen(true)}
                >
                  {VOICE_MESSAGES.addContactButton}
                </Button>
              </div>
            ) : null}
          </div>
        }
        detailsColumn={<InboxDetailsPanel conversation={activeConversation} />}
      />

      <VoiceContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onSelectContact={handleContactSelect}
      />

      <VoiceAddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        phoneNumber={phoneDraft}
        onContactCreated={({ conversationId: nextConversationId }) => {
          handleConversationSelect(nextConversationId);
        }}
      />
    </>
  );
}
