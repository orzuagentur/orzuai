"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, HeadphonesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  findFirstActiveVoiceCall,
} from "@/components/voice/VoiceActiveCallBanner";
import { VoiceLiveCallCard } from "@/components/voice/VoiceLiveCallCard";
import { VoiceLiveTranscriptPanel } from "@/components/voice/VoiceLiveTranscriptPanel";
import { VoiceMonitorAudioPlayer } from "@/components/voice/VoiceMonitorAudioPlayer";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { useVoiceCallsRealtime } from "@/hooks/use-voice-calls-realtime";
import type { VoiceCallDetail, VoiceInboxPageData } from "@/types/voice-inbox.types";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

type VoiceCallMonitorPanelProps = Partial<VoiceInboxPageData>;

export function VoiceCallMonitorPanel(props: VoiceCallMonitorPanelProps) {
  return (
    <Suspense fallback={<MonitorFallback />}>
      <VoiceCallMonitorContent {...props} />
    </Suspense>
  );
}

function MonitorFallback() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
      {VOICE_MESSAGES.inboxLoading}
    </div>
  );
}

function VoiceCallMonitorContent({
  hasBusiness = true,
  businessId = null,
  voiceInboxEnabled = false,
  calls: initialCalls = [],
  activeCall: initialActiveCall = null,
}: VoiceCallMonitorPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCallId = searchParams.get("call")?.trim() || null;

  const [calls, setCalls] = useState(initialCalls);
  const [activeCallDetail, setActiveCallDetail] = useState<VoiceCallDetail | null>(
    initialActiveCall,
  );

  useEffect(() => {
    setCalls(initialCalls);
  }, [initialCalls]);

  useEffect(() => {
    setActiveCallDetail(initialActiveCall);
  }, [initialActiveCall]);

  useVoiceCallsRealtime({
    enabled: voiceInboxEnabled && Boolean(businessId),
    businessId,
    activeCallId: selectedCallId,
    onCallsChange: setCalls,
    onActiveCallChange: setActiveCallDetail,
  });

  const activeCalls = useMemo(
    () => calls.filter((call) => isActiveVoiceCallStatus(call.status)),
    [calls],
  );

  const monitoredCall = useMemo((): VoiceCallDetail | null => {
    if (selectedCallId) {
      if (activeCallDetail?.id === selectedCallId) {
        return activeCallDetail;
      }

      const listItem = calls.find((call) => call.id === selectedCallId);
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

    const firstActive = findFirstActiveVoiceCall(calls);
    if (!firstActive) {
      return null;
    }

    if (activeCallDetail?.id === firstActive.id) {
      return activeCallDetail;
    }

    return {
      ...firstActive,
      turns: [],
      turnCount: 0,
      hasRecording: Boolean(firstActive.recordingUrl),
      events: [],
    };
  }, [activeCallDetail, calls, selectedCallId]);

  const handleSelectCall = useCallback(
    (callId: string) => {
      router.push(`${DASHBOARD_ROUTES.chatsVoiceMonitor}?call=${callId}`);
    },
    [router],
  );

  if (!hasBusiness || !voiceInboxEnabled) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{VOICE_MESSAGES.inboxNotConnectedTitle}</CardTitle>
            <CardDescription>
              {VOICE_MESSAGES.inboxNotConnectedDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" asChild>
            <Link href={DASHBOARD_ROUTES.chatsVoice}>
              <ArrowLeftIcon className="size-4" />
              {VOICE_MESSAGES.inboxTabLabel}
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{VOICE_MESSAGES.callMonitorTitle}</h1>
            <p className="text-xs text-muted-foreground">
              {VOICE_MESSAGES.callMonitorDescription}
            </p>
          </div>
        </div>
        <BadgeCount count={activeCalls.length} />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r">
          {activeCalls.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {VOICE_MESSAGES.callMonitorEmpty}
            </p>
          ) : (
            <div className="space-y-1 p-2">
              {activeCalls.map((call) => (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => handleSelectCall(call.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    monitoredCall?.id === call.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium">
                    {call.contactName ?? call.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getVoiceCallStatusLabel(call.status)} ·{" "}
                    {call.aiHandled
                      ? VOICE_MESSAGES.callModeAiTitle
                      : VOICE_MESSAGES.callModeHumanTitle}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex min-h-0 flex-col">
          {monitoredCall ? (
            <>
              <VoiceLiveCallCard call={monitoredCall} defaultCollapsed={false} />
              <div className="shrink-0 border-b px-4 py-3">
                <VoiceMonitorAudioPlayer
                  callLogId={monitoredCall.id}
                  callStatus={monitoredCall.status}
                  autoStart
                />
              </div>
              {monitoredCall.hasRecording ? (
                <div className="shrink-0 border-b px-4 py-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <HeadphonesIcon className="size-3.5" />
                    {VOICE_MESSAGES.callRecordingTitle}
                  </p>
                  <audio
                    controls
                    preload="none"
                    className="h-10 w-full max-w-xl"
                    src={`/api/voice/recording?callLogId=${monitoredCall.id}`}
                  />
                </div>
              ) : null}
              <VoiceLiveTranscriptPanel
                turns={monitoredCall.turns}
                isLive={isActiveVoiceCallStatus(monitoredCall.status)}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              {VOICE_MESSAGES.callMonitorEmpty}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function BadgeCount({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
      {count} live
    </span>
  );
}

function getVoiceCallStatusLabel(status: string): string {
  switch (status) {
    case "active":
    case "answered":
    case "in-progress":
      return "Active";
    case "ringing":
    case "initiated":
    case "queued":
      return "Ringing";
    default:
      return status;
  }
}
