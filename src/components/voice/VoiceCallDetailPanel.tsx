"use client";

import Link from "next/link";
import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ListChecksIcon,
  Loader2Icon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneIcon,
  PhoneOffIcon,
  PlayIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import {
  VoiceCallModeDialog,
  type VoiceCallMode,
  type VoiceCallModeSelection,
} from "@/components/voice/VoiceCallModeDialog";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type {
  VoiceCallDetail,
  VoiceCallEventItem,
} from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { scheduleVoiceInboxRefresh } from "@/utils/voice-inbox-refresh";
import {
  formatVoiceCallDateParts,
  formatVoiceCallDuration,
  getVoiceCallStatusClassName,
  getVoiceCallStatusLabel,
  isActiveVoiceCallStatus,
} from "@/utils/voice-call-display";

type VoiceCallDetailPanelProps = {
  call: VoiceCallDetail | null;
  isLive?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
};

type SummaryPayload = {
  summary: string | null;
  outcome: string | null;
  sentiment: string | null;
  actionItems: string[];
};

type ActionItemsPayload = {
  actionItems: { title: string; priority: string; owner: string }[];
};

type ConferenceParticipantAction =
  | "hold"
  | "resume"
  | "mute"
  | "unmute"
  | "remove";

type ConferenceParticipant = {
  callSid: string;
  conferenceSid: string;
  label: string;
  active: boolean;
  hold: boolean;
  muted: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPayloadBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | null {
  const value = payload[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return null;
}

function parseSummaryPayload(event: VoiceCallEventItem | undefined): SummaryPayload | null {
  if (!event || !isRecord(event.payload)) {
    return null;
  }

  const actionItems = Array.isArray(event.payload.actionItems)
    ? event.payload.actionItems
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    summary:
      typeof event.payload.summary === "string" ? event.payload.summary.trim() : null,
    outcome:
      typeof event.payload.outcome === "string" ? event.payload.outcome.trim() : null,
    sentiment:
      typeof event.payload.sentiment === "string"
        ? event.payload.sentiment.trim()
        : null,
    actionItems,
  };
}

function parseActionItemsPayload(
  event: VoiceCallEventItem | undefined,
): ActionItemsPayload | null {
  if (!event || !isRecord(event.payload) || !Array.isArray(event.payload.actionItems)) {
    return null;
  }

  const actionItems: ActionItemsPayload["actionItems"] = [];

  for (const rawItem of event.payload.actionItems) {
    if (!isRecord(rawItem)) {
      continue;
    }

    const title = typeof rawItem.title === "string" ? rawItem.title.trim() : "";

    if (!title) {
      continue;
    }

    actionItems.push({
      title,
      priority:
        typeof rawItem.priority === "string" ? rawItem.priority.trim() : "medium",
      owner: typeof rawItem.owner === "string" ? rawItem.owner.trim() : "operator",
    });
  }

  return { actionItems };
}

function parseTranscriptPayload(event: VoiceCallEventItem | undefined): string | null {
  if (!event || !isRecord(event.payload)) {
    return null;
  }

  return typeof event.payload.transcript === "string"
    ? event.payload.transcript.trim()
    : null;
}

function formatCallEventType(eventType: string): string {
  return eventType
    .replace(/^voice_post_call\./, "")
    .replace(/^call\./, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ");
}

function getCurrentSpeakerLabel(call: VoiceCallDetail): string {
  const lastTurn = call.turns.at(-1);

  if (!lastTurn) {
    return call.aiHandled
      ? VOICE_MESSAGES.callTranscriptAssistant
      : VOICE_MESSAGES.callTranscriptUser;
  }

  return lastTurn.role === "assistant"
    ? VOICE_MESSAGES.callTranscriptAssistant
    : VOICE_MESSAGES.callTranscriptUser;
}

function getConferenceParticipants(
  events: VoiceCallEventItem[],
): ConferenceParticipant[] {
  const participants = new Map<string, ConferenceParticipant>();

  for (const event of [...events].reverse()) {
    if (!event.eventType.startsWith("conference.") || !isRecord(event.payload)) {
      continue;
    }

    const callSid = getPayloadString(event.payload, "participantCallSid");
    const conferenceSid = getPayloadString(event.payload, "conferenceSid");

    if (!callSid || !conferenceSid) {
      continue;
    }

    const current = participants.get(callSid);
    const eventName = event.eventType.replace(/^conference\./, "");
    const activeFromPayload = getPayloadBoolean(event.payload, "active");
    const holdFromPayload = getPayloadBoolean(event.payload, "hold");
    const mutedFromPayload = getPayloadBoolean(event.payload, "muted");
    const active =
      activeFromPayload ??
      (eventName === "leave" ||
      eventName === "participant-leave" ||
      eventName === "end" ||
      eventName === "conference-end"
        ? false
        : (current?.active ?? true));

    participants.set(callSid, {
      callSid,
      conferenceSid,
      label:
        getPayloadString(event.payload, "participantLabel") ??
        current?.label ??
        VOICE_MESSAGES.callConferenceParticipantUnknown,
      active,
      hold: holdFromPayload ?? current?.hold ?? false,
      muted: mutedFromPayload ?? current?.muted ?? false,
    });
  }

  return [...participants.values()].filter((participant) => participant.active);
}

export function VoiceCallDetailPanel({
  call,
  isLive = false,
  showBackButton = false,
  onBack,
  className,
}: VoiceCallDetailPanelProps) {
  const router = useRouter();
  const [isCalling, startCalling] = useTransition();
  const [callModeOpen, setCallModeOpen] = useState(false);
  const [pendingCallMode, setPendingCallMode] = useState<VoiceCallMode | null>(
    null,
  );
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [pendingConferenceAction, setPendingConferenceAction] = useState<
    string | null
  >(null);
  const [smsBody, setSmsBody] = useState("");
  const [isSmsSending, setIsSmsSending] = useState(false);
  const [useLocalTime, setUseLocalTime] = useState(false);

  useEffect(() => {
    setUseLocalTime(true);
  }, []);

  if (!call) {
    return (
      <EmptyState
        className={cn("h-full border-0", className)}
        title={VOICE_MESSAGES.callDetailEmpty}
        description=""
      />
    );
  }

  const canHandoff =
    call.aiHandled &&
    isActiveVoiceCallStatus(call.status);
  const callStartedAtLabel = formatVoiceCallDateParts(call.createdAt, {
    local: useLocalTime,
  }).fullLabel;

  function handleCallBack() {
    setCallModeOpen(true);
  }

  function handleCallModeSelect(selection: VoiceCallModeSelection) {
    if (!call || pendingCallMode) {
      return;
    }

    setPendingCallMode("ai");

    startCalling(async () => {
      try {
        const result = await triggerContactVoiceCallAction({
          phoneNumber: call.phoneNumber,
          contactId: call.contactId ?? undefined,
          customPrompt: selection.customPrompt,
        });

        if (!result.success) {
          toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
          return;
        }

        toast.success(result.message ?? VOICE_MESSAGES.callOutboundSuccess);
        setCallModeOpen(false);

        if (result.callLogId) {
          router.push(`${DASHBOARD_ROUTES.voice}?call=${result.callLogId}`);
        }

        scheduleVoiceInboxRefresh(() => router.refresh());
      } finally {
        setPendingCallMode(null);
      }
    });
  }

  function handleHandoff() {
    setIsHandoffPending(true);

    void fetch("/api/voice/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callLogId: call!.id }),
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          success?: boolean;
          message?: string;
        };

        if (!result.success) {
          throw new Error(result.message ?? VOICE_MESSAGES.callHandoffFailed);
        }

        toast.success(VOICE_MESSAGES.callHandoffSuccess);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : VOICE_MESSAGES.callHandoffFailed,
        );
      })
      .finally(() => {
        setIsHandoffPending(false);
      });
  }

  function handleSendSms() {
    const message = smsBody.trim();

    if (!message) {
      return;
    }

    setIsSmsSending(true);

    void fetch("/api/voice/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: call!.phoneNumber,
        message,
      }),
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          success?: boolean;
          message?: string;
        };

        if (!result.success) {
          throw new Error(result.message ?? VOICE_MESSAGES.callSmsFailed);
        }

        setSmsBody("");
        toast.success(VOICE_MESSAGES.callSmsSuccess);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : VOICE_MESSAGES.callSmsFailed,
        );
      })
      .finally(() => {
        setIsSmsSending(false);
      });
  }

  function handleConferenceParticipantAction(
    participant: ConferenceParticipant,
    action: ConferenceParticipantAction,
  ) {
    const actionKey = `${participant.callSid}:${action}`;
    setPendingConferenceAction(actionKey);

    void fetch("/api/voice/conference/participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callLogId: call!.id,
        conferenceSid: participant.conferenceSid,
        participantCallSid: participant.callSid,
        action,
      }),
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          success?: boolean;
          message?: string;
        };

        if (!result.success) {
          throw new Error(
            result.message ?? VOICE_MESSAGES.callConferenceControlFailed,
          );
        }

        toast.success(VOICE_MESSAGES.callConferenceControlSuccess);
        scheduleVoiceInboxRefresh(() => router.refresh());
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : VOICE_MESSAGES.callConferenceControlFailed,
        );
      })
      .finally(() => {
        setPendingConferenceAction(null);
      });
  }

  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const summaryPayload = parseSummaryPayload(
    call.events.find(
      (event) => event.eventType === "voice_post_call.summary.created",
    ),
  );
  const extractedActionItems =
    parseActionItemsPayload(
      call.events.find(
        (event) =>
          event.eventType === "voice_post_call.action_items.extracted",
      ),
    )?.actionItems ?? [];
  const summaryActionItems = summaryPayload?.actionItems ?? [];
  const eventTranscript = parseTranscriptPayload(
    call.events.find(
      (event) => event.eventType === "voice_post_call.transcript.created",
    ),
  );
  const isLiveMonitoringVisible = isLive || isActiveVoiceCallStatus(call.status);
  const conferenceParticipants = getConferenceParticipants(call.events);
  const liveDurationSeconds = call.durationSeconds;
  const transcriptionEnabled = call.turns.length > 0 || Boolean(eventTranscript);
  const hasPostCallAnalysis =
    Boolean(summaryPayload?.summary) ||
    extractedActionItems.length > 0 ||
    summaryActionItems.length > 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {showBackButton ? (
        <div className="shrink-0 border-b px-3 py-2 lg:hidden">
          <Button variant="ghost" size="sm" type="button" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            {VOICE_MESSAGES.inboxTabLabel}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ContactAvatar name={displayName} className="size-10 shrink-0" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{displayName}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {formatContactIdentifier(call.phoneNumber)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {call.direction === "inbound"
                    ? VOICE_MESSAGES.callDirectionInbound
                    : VOICE_MESSAGES.callDirectionOutbound}
                </Badge>
                <span
                  className={cn(
                    "text-xs font-medium",
                    getVoiceCallStatusClassName(call.status),
                  )}
                >
                  {getVoiceCallStatusLabel(call.status)}
                </span>
                {call.aiHandled ? (
                  <Badge variant="secondary">{VOICE_MESSAGES.callAiHandled}</Badge>
                ) : null}
                {call.humanHandled ? (
                  <Badge variant="secondary">{VOICE_MESSAGES.callHumanHandled}</Badge>
                ) : null}
                {isLive ? (
                  <Badge variant="destructive">{VOICE_MESSAGES.callLiveBadge}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {canHandoff ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={isHandoffPending}
                onClick={handleHandoff}
              >
                {isHandoffPending ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <UserIcon className="mr-2 size-4" />
                )}
                {isHandoffPending
                  ? VOICE_MESSAGES.callHandoffPending
                  : VOICE_MESSAGES.callHandoff}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={isCalling || Boolean(pendingCallMode)}
              onClick={handleCallBack}
            >
              {isCalling || pendingCallMode ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <PhoneIcon className="mr-2 size-4" />
              )}
              {isCalling || pendingCallMode
                ? VOICE_MESSAGES.callOutboundPending
                : VOICE_MESSAGES.callOutbound}
            </Button>
          </div>
        </div>

        <VoiceCallModeDialog
          open={callModeOpen}
          phoneNumber={call.phoneNumber}
          pendingMode={pendingCallMode}
          onOpenChange={setCallModeOpen}
          onSelectMode={handleCallModeSelect}
        />

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {VOICE_MESSAGES.callStartedAt}
            </dt>
            <dd>{callStartedAtLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {VOICE_MESSAGES.callDuration}
            </dt>
            <dd>{formatVoiceCallDuration(call.durationSeconds)}</dd>
          </div>
          {call.contactId ? (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">
                {VOICE_MESSAGES.callContactLabel}
              </dt>
              <dd>
                <Link
                  href={`${DASHBOARD_ROUTES.contacts}?contact=${call.contactId}`}
                  className="text-primary hover:underline"
                >
                  {displayName}
                </Link>
              </dd>
            </div>
          ) : null}
          {call.conversationId ? (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">
                {VOICE_MESSAGES.callConversationLink}
              </dt>
              <dd>
                <Link
                  href={`${DASHBOARD_ROUTES.chats}?conversation=${call.conversationId}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MessageSquareIcon className="size-3.5" />
                  {VOICE_MESSAGES.callConversationLink}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {isLiveMonitoringVisible ? (
          <div className="mt-4 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {VOICE_MESSAGES.callLiveMonitoringTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {VOICE_MESSAGES.callLiveMonitoringDescription}
                </p>
              </div>
              <Badge variant={call.aiHandled ? "secondary" : "outline"}>
                {call.aiHandled
                  ? VOICE_MESSAGES.callModeAiTitle
                  : VOICE_MESSAGES.callModeHumanTitle}
              </Badge>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callMonitoringStatus}
                value={getVoiceCallStatusLabel(call.status)}
              />
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callDuration}
                value={formatVoiceCallDuration(liveDurationSeconds)}
              />
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callMonitoringSpeaker}
                value={getCurrentSpeakerLabel(call)}
              />
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callMonitoringRecording}
                value={
                  call.hasRecording
                    ? VOICE_MESSAGES.callMonitoringOn
                    : VOICE_MESSAGES.callMonitoringOff
                }
              />
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callMonitoringTranscription}
                value={
                  transcriptionEnabled
                    ? VOICE_MESSAGES.callMonitoringOn
                    : VOICE_MESSAGES.callMonitoringOff
                }
              />
              <LiveMonitoringMetric
                label={VOICE_MESSAGES.callMonitoringOperator}
                value={
                  call.operatorUserId || call.humanHandled
                    ? VOICE_MESSAGES.callMonitoringReady
                    : VOICE_MESSAGES.callMonitoringUnavailable
                }
              />
            </div>

            {conferenceParticipants.length > 0 ? (
              <div className="mt-3 rounded-lg bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {VOICE_MESSAGES.callConferenceParticipantsTitle}
                  </p>
                  <Badge variant="outline">
                    {conferenceParticipants.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {conferenceParticipants.map((participant) => (
                    <ConferenceParticipantControls
                      key={participant.callSid}
                      participant={participant}
                      pendingAction={pendingConferenceAction}
                      onAction={handleConferenceParticipantAction}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {call.hasRecording ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {VOICE_MESSAGES.callRecordingTitle}
            </p>
            <audio
              controls
              preload="none"
              className="h-10 w-full max-w-md"
              src={`/api/voice/recording?callLogId=${call.id}`}
            />
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {VOICE_MESSAGES.callSmsTitle}
          </p>
          <Textarea
            value={smsBody}
            onChange={(event) => setSmsBody(event.target.value)}
            placeholder={VOICE_MESSAGES.callSmsPlaceholder}
            rows={2}
            className="min-h-0 resize-none text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSmsSending || !smsBody.trim()}
            onClick={handleSendSms}
          >
            {isSmsSending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <MessageSquareIcon className="mr-2 size-4" />
            )}
            {isSmsSending ? VOICE_MESSAGES.callSmsSending : VOICE_MESSAGES.callSmsSend}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <h3 className="text-sm font-medium">
              {VOICE_MESSAGES.callPostCallTitle}
            </h3>
          </div>

          {!hasPostCallAnalysis ? (
            <p className="text-sm text-muted-foreground">
              {VOICE_MESSAGES.callPostCallEmpty}
            </p>
          ) : (
            <div className="space-y-3">
              {summaryPayload?.summary ? (
                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {VOICE_MESSAGES.callSummaryTitle}
                  </p>
                  <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {summaryPayload.summary}
                  </p>
                  {summaryPayload.outcome || summaryPayload.sentiment ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {summaryPayload.outcome ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {VOICE_MESSAGES.callOutcomeTitle}
                          </p>
                          <p>{summaryPayload.outcome}</p>
                        </div>
                      ) : null}
                      {summaryPayload.sentiment ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {VOICE_MESSAGES.callSentimentTitle}
                          </p>
                          <p className="capitalize">{summaryPayload.sentiment}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {extractedActionItems.length > 0 || summaryActionItems.length > 0 ? (
                <div className="rounded-xl border p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ListChecksIcon className="size-3.5" />
                    {VOICE_MESSAGES.callActionItemsTitle}
                  </div>
                  <ul className="space-y-2">
                    {extractedActionItems.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>
                          {item.title}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.priority} / {item.owner}
                          </span>
                        </span>
                      </li>
                    ))}
                    {summaryActionItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium">
            {VOICE_MESSAGES.callEventLogTitle}
          </h3>
          {call.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {VOICE_MESSAGES.callPostCallEmpty}
            </p>
          ) : (
            <div className="space-y-2">
              {call.events.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {formatCallEventType(event.eventType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.actorType}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {
                      formatVoiceCallDateParts(event.createdAt, {
                        local: useLocalTime,
                      }).timeLabel
                    }
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>

        <h3 className="mb-3 text-sm font-medium">{VOICE_MESSAGES.callDetailTitle}</h3>
        {call.turns.length === 0 && !eventTranscript ? (
          <p className="text-sm text-muted-foreground">
            {VOICE_MESSAGES.callNoTranscript}
          </p>
        ) : call.turns.length > 0 ? (
          <div className="space-y-3">
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
        ) : (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {VOICE_MESSAGES.callTranscriptUser}
            </p>
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              {eventTranscript}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveMonitoringMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function ConferenceParticipantControls({
  participant,
  pendingAction,
  onAction,
}: {
  participant: ConferenceParticipant;
  pendingAction: string | null;
  onAction: (
    participant: ConferenceParticipant,
    action: ConferenceParticipantAction,
  ) => void;
}) {
  const holdAction: ConferenceParticipantAction = participant.hold
    ? "resume"
    : "hold";
  const muteAction: ConferenceParticipantAction = participant.muted
    ? "unmute"
    : "mute";
  const isHoldPending = pendingAction === `${participant.callSid}:${holdAction}`;
  const isMutePending = pendingAction === `${participant.callSid}:${muteAction}`;
  const isRemovePending = pendingAction === `${participant.callSid}:remove`;
  const isAnyPending = Boolean(pendingAction);

  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium capitalize">
            {participant.label}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {participant.hold ? (
              <Badge variant="secondary">
                {VOICE_MESSAGES.callConferenceHold}
              </Badge>
            ) : null}
            {participant.muted ? (
              <Badge variant="secondary">
                {VOICE_MESSAGES.callConferenceMuted}
              </Badge>
            ) : null}
            {!participant.hold && !participant.muted ? (
              <span className="text-xs text-muted-foreground">
                {VOICE_MESSAGES.callConferenceActive}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isAnyPending}
            onClick={() => onAction(participant, holdAction)}
          >
            {isHoldPending ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : participant.hold ? (
              <PlayIcon className="mr-1.5 size-3.5" />
            ) : (
              <PauseIcon className="mr-1.5 size-3.5" />
            )}
            {participant.hold
              ? VOICE_MESSAGES.callConferenceResume
              : VOICE_MESSAGES.callConferenceHold}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isAnyPending}
            onClick={() => onAction(participant, muteAction)}
          >
            {isMutePending ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : participant.muted ? (
              <MicIcon className="mr-1.5 size-3.5" />
            ) : (
              <MicOffIcon className="mr-1.5 size-3.5" />
            )}
            {participant.muted
              ? VOICE_MESSAGES.callConferenceUnmute
              : VOICE_MESSAGES.callConferenceMute}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isAnyPending}
            onClick={() => onAction(participant, "remove")}
          >
            {isRemovePending ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <PhoneOffIcon className="mr-1.5 size-3.5" />
            )}
            {VOICE_MESSAGES.callConferenceRemove}
          </Button>
        </div>
      </div>
    </div>
  );
}
