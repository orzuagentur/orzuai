"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import { InboxLayoutProvider } from "@/components/chats/inbox/inbox-layout-context";
import {
  findFirstActiveVoiceCall,
  VoiceActiveCallBanner,
} from "@/components/voice/VoiceActiveCallBanner";
import { VoiceCallDetailPanel } from "@/components/voice/VoiceCallDetailPanel";
import { VoiceSoftphoneBar } from "@/components/voice/VoiceSoftphoneBar";
import { VoiceSoftphoneProvider } from "@/components/voice/voice-softphone-context";
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
import {
  filterVoiceCalls,
  isActiveVoiceCallStatus,
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
  softphoneEnabled = false,
  visibleChannelIds = [] as MessagingChannel[],
  calls: initialCalls = [],
  activeCall: initialActiveCall = null,
}: VoiceCallsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCallId = searchParams.get("call")?.trim() || null;

  const [calls, setCalls] = useState(initialCalls);
  const [activeCallDetail, setActiveCallDetail] = useState<VoiceCallDetail | null>(
    initialActiveCall,
  );
  const [callFilter, setCallFilter] = useState<VoiceCallFilter>("all");

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

  const filteredCalls = useMemo(
    () => filterVoiceCalls(calls, callFilter),
    [callFilter, calls],
  );

  const liveCall = useMemo(() => findFirstActiveVoiceCall(calls), [calls]);

  const selectedCall = useMemo(() => {
    if (!activeCallId) {
      return null;
    }

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
    };
  }, [activeCallDetail, activeCallId, calls]);

  const handleCallSelect = useCallback(
    (callId: string) => {
      router.push(`${DASHBOARD_ROUTES.chatsVoice}?call=${callId}`);
    },
    [router],
  );

  const handleBackToList = useCallback(() => {
    router.push(DASHBOARD_ROUTES.chatsVoice);
  }, [router]);

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
        chatColumn={<VoiceCallDetailPanel call={null} />}
        detailsColumn={null}
      />
    );
  }

  const showDetailOnMobile = Boolean(activeCallId);
  const showLiveBanner =
    liveCall != null && (!activeCallId || liveCall.id !== activeCallId);

  return (
    <VoiceSoftphoneProvider enabled={softphoneEnabled} businessId={businessId}>
      <InboxShell
        showChatOnMobile={showDetailOnMobile}
        showRightColumn={false}
        channelTabs={
          <InboxChannelTabs
            activeChannel="voice"
            visibleChannelIds={visibleChannelIds}
            voiceInboxEnabled
          />
        }
        listColumn={
          <div className="flex min-h-0 flex-1 flex-col">
            <VoiceSoftphoneBar />
            {showLiveBanner && liveCall ? <VoiceActiveCallBanner call={liveCall} /> : null}
            <div className="shrink-0 border-b px-4 py-3">
              <h1 className="text-base font-semibold">{VOICE_MESSAGES.inboxTabLabel}</h1>
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
            <VoiceCallDetailPanel
              call={selectedCall}
              isLive={selectedCall ? isActiveVoiceCallStatus(selectedCall.status) : false}
            />
          </div>
        }
        detailsColumn={null}
      />
    </VoiceSoftphoneProvider>
  );
}
