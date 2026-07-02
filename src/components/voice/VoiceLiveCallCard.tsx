"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  HeadphonesIcon,
  Loader2Icon,
  MicIcon,
  MicOffIcon,
  PauseIcon,
  PhoneForwardedIcon,
  PhoneOffIcon,
  PlayIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail, VoiceCallEventItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDuration,
  getVoiceCallStatusClassName,
  getVoiceCallStatusLabel,
  isActiveVoiceCallStatus,
} from "@/utils/voice-call-display";

type ConferenceParticipant = {
  callSid: string;
  conferenceSid: string;
  label: string;
  hold: boolean;
  muted: boolean;
};

type VoiceLiveCallCardProps = {
  call: VoiceCallDetail;
  className?: string;
  defaultCollapsed?: boolean;
};

function parseConferenceParticipants(
  events: VoiceCallEventItem[],
): ConferenceParticipant[] {
  const participants = new Map<string, ConferenceParticipant>();

  for (const event of [...events].reverse()) {
    if (!event.eventType.startsWith("conference.")) {
      continue;
    }

    const payload = event.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }

    const record = payload as Record<string, unknown>;
    const callSid =
      typeof record.participantCallSid === "string"
        ? record.participantCallSid
        : null;
    const conferenceSid =
      typeof record.conferenceSid === "string" ? record.conferenceSid : null;

    if (!callSid || !conferenceSid) {
      continue;
    }

    const existing = participants.get(callSid);
    const eventName = event.eventType.replace(/^conference\./, "");
    const inactive =
      eventName === "leave" ||
      eventName === "participant-leave" ||
      eventName === "end" ||
      eventName === "conference-end";

    if (inactive) {
      participants.delete(callSid);
      continue;
    }

    participants.set(callSid, {
      callSid,
      conferenceSid,
      label:
        typeof record.participantLabel === "string"
          ? record.participantLabel
          : (existing?.label ?? VOICE_MESSAGES.callConferenceParticipantUnknown),
      hold:
        typeof record.hold === "boolean"
          ? record.hold
          : (existing?.hold ?? false),
      muted:
        typeof record.muted === "boolean"
          ? record.muted
          : (existing?.muted ?? false),
    });
  }

  return [...participants.values()];
}

function useLiveCallDuration(
  createdAt: string,
  isActive: boolean,
  fallbackSeconds: number | null,
): number | null {
  const [elapsed, setElapsed] = useState<number | null>(fallbackSeconds);

  useEffect(() => {
    if (!isActive) {
      setElapsed(fallbackSeconds);
      return;
    }

    const startedAt = new Date(createdAt).getTime();

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [createdAt, fallbackSeconds, isActive]);

  return elapsed;
}

export function VoiceLiveCallCard({
  call,
  className,
  defaultCollapsed = false,
}: VoiceLiveCallCardProps) {
  const softphone = useVoiceSoftphone();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [isEndPending, setIsEndPending] = useState(false);
  const [pendingConferenceAction, setPendingConferenceAction] = useState<
    string | null
  >(null);

  const isLive = isActiveVoiceCallStatus(call.status);
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);
  const durationSeconds = useLiveCallDuration(
    call.createdAt,
    isLive,
    call.durationSeconds,
  );
  const conferenceParticipants = useMemo(
    () => parseConferenceParticipants(call.events),
    [call.events],
  );
  const customerParticipant = conferenceParticipants.find((participant) =>
    participant.label.toLowerCase().includes("customer"),
  );
  const canHandoff =
    softphone.enabled && call.aiHandled && isLive && !call.humanHandled;
  const canJoin =
    softphone.enabled &&
    isLive &&
    (call.humanHandled || call.callMode === "human");
  const modeLabel = call.aiHandled
    ? VOICE_MESSAGES.callModeAiTitle
    : call.humanHandled
      ? VOICE_MESSAGES.callModeHumanTitle
      : VOICE_MESSAGES.callModeHumanTitle;

  if (!isLive) {
    return null;
  }

  async function handleHandoff() {
    setIsHandoffPending(true);

    try {
      const response = await fetch("/api/voice/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callLogId: call.id }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!result.success) {
        throw new Error(result.message ?? VOICE_MESSAGES.callHandoffFailed);
      }

      toast.success(VOICE_MESSAGES.callHandoffSuccess);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : VOICE_MESSAGES.callHandoffFailed,
      );
    } finally {
      setIsHandoffPending(false);
    }
  }

  async function handleEndCall() {
    setIsEndPending(true);

    try {
      const response = await fetch("/api/voice/end-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callLogId: call.id }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!result.success) {
        throw new Error(result.message ?? VOICE_MESSAGES.callEndFailed);
      }

      toast.success(VOICE_MESSAGES.callEndSuccess);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : VOICE_MESSAGES.callEndFailed,
      );
    } finally {
      setIsEndPending(false);
    }
  }

  async function handleConferenceAction(
    participant: ConferenceParticipant,
    action: "hold" | "resume" | "mute" | "unmute",
  ) {
    const actionKey = `${participant.callSid}:${action}`;
    setPendingConferenceAction(actionKey);

    try {
      const response = await fetch("/api/voice/conference/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callLogId: call.id,
          conferenceSid: participant.conferenceSid,
          participantCallSid: participant.callSid,
          action,
        }),
      });
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : VOICE_MESSAGES.callConferenceControlFailed,
      );
    } finally {
      setPendingConferenceAction(null);
    }
  }

  function handleJoin() {
    if (canHandoff) {
      void handleHandoff();
      return;
    }

    if (canJoin && call.phoneNumber) {
      void softphone.placeCall(call.phoneNumber).catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : VOICE_MESSAGES.callOutboundFailed,
        );
      });
    }
  }

  return (
    <section
      className={cn(
        "shrink-0 border-b bg-gradient-to-b from-red-50/80 to-background px-4 py-3 dark:from-red-950/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative">
            <ContactAvatar name={displayName} className="size-11" />
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-600" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <Badge variant="destructive">{VOICE_MESSAGES.callLiveBadge}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {formatContactIdentifier(call.phoneNumber)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={getVoiceCallStatusClassName(call.status)}>
                {getVoiceCallStatusLabel(call.status)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono font-medium">
                {formatVoiceCallDuration(durationSeconds)}
              </span>
              <span className="text-muted-foreground">·</span>
              <Badge variant="secondary">{modeLabel}</Badge>
            </div>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed
              ? VOICE_MESSAGES.callLiveCardExpand
              : VOICE_MESSAGES.callLiveCardCollapse
          }
        >
          {collapsed ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronUpIcon className="size-4" />
          )}
        </Button>
      </div>

      {!collapsed ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <Metric
              label={VOICE_MESSAGES.callStatusLabel}
              value={getVoiceCallStatusLabel(call.status)}
            />
            <Metric
              label={VOICE_MESSAGES.callActiveOperator}
              value={
                call.operatorUserId || call.humanHandled
                  ? VOICE_MESSAGES.callMonitoringReady
                  : VOICE_MESSAGES.callNoOperator
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(canHandoff || canJoin) && (
              <Button
                type="button"
                size="sm"
                disabled={isHandoffPending}
                onClick={handleJoin}
              >
                {isHandoffPending ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <UserIcon className="mr-2 size-4" />
                )}
                {canHandoff
                  ? VOICE_MESSAGES.callTakeOver
                  : VOICE_MESSAGES.callJoin}
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              asChild
            >
              <Link
                href={`${DASHBOARD_ROUTES.chatsVoiceMonitor}?call=${call.id}`}
              >
                <HeadphonesIcon className="mr-2 size-4" />
                {VOICE_MESSAGES.callListenLive}
              </Link>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canHandoff || isHandoffPending}
              onClick={() => void handleHandoff()}
            >
              <PhoneForwardedIcon className="mr-2 size-4" />
              {VOICE_MESSAGES.callTransfer}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isEndPending}
              onClick={() => void handleEndCall()}
            >
              {isEndPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <PhoneOffIcon className="mr-2 size-4" />
              )}
              {isEndPending
                ? VOICE_MESSAGES.callEndPending
                : VOICE_MESSAGES.callEnd}
            </Button>

            {customerParticipant ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={Boolean(pendingConferenceAction)}
                  onClick={() =>
                    void handleConferenceAction(
                      customerParticipant,
                      customerParticipant.hold ? "resume" : "hold",
                    )
                  }
                >
                  {customerParticipant.hold ? (
                    <PlayIcon className="mr-2 size-4" />
                  ) : (
                    <PauseIcon className="mr-2 size-4" />
                  )}
                  {customerParticipant.hold
                    ? VOICE_MESSAGES.callResume
                    : VOICE_MESSAGES.callHold}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={Boolean(pendingConferenceAction)}
                  onClick={() =>
                    void handleConferenceAction(
                      customerParticipant,
                      customerParticipant.muted ? "unmute" : "mute",
                    )
                  }
                >
                  {customerParticipant.muted ? (
                    <MicOffIcon className="mr-2 size-4" />
                  ) : (
                    <MicIcon className="mr-2 size-4" />
                  )}
                  {customerParticipant.muted
                    ? VOICE_MESSAGES.callConferenceUnmute
                    : VOICE_MESSAGES.callConferenceMute}
                </Button>
              </>
            ) : softphone.status === "on-call" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={softphone.toggleMute}
              >
                {softphone.isMuted ? (
                  <MicOffIcon className="mr-2 size-4" />
                ) : (
                  <MicIcon className="mr-2 size-4" />
                )}
                {softphone.isMuted
                  ? VOICE_MESSAGES.softphoneUnmute
                  : VOICE_MESSAGES.softphoneMute}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
