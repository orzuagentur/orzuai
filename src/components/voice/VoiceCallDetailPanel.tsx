"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { ArrowLeftIcon, Loader2Icon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { useVoiceSoftphone } from "@/components/voice/voice-softphone-context";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceCallDetail } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  formatVoiceCallDuration,
  getVoiceCallStatusClassName,
  getVoiceCallStatusLabel,
} from "@/utils/voice-call-display";

type VoiceCallDetailPanelProps = {
  call: VoiceCallDetail | null;
  isLive?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
};

export function VoiceCallDetailPanel({
  call,
  isLive = false,
  showBackButton = false,
  onBack,
  className,
}: VoiceCallDetailPanelProps) {
  const [isCalling, startCalling] = useTransition();
  const [isBrowserCalling, setIsBrowserCalling] = useState(false);
  const softphone = useVoiceSoftphone();

  if (!call) {
    return (
      <EmptyState
        className={cn("h-full border-0", className)}
        title={VOICE_MESSAGES.callDetailEmpty}
        description=""
      />
    );
  }

  function handleBrowserCall() {
    if (!call) {
      return;
    }

    setIsBrowserCalling(true);

    void softphone
      .placeCall(call.phoneNumber)
      .then(() => {
        toast.success(VOICE_MESSAGES.callOutboundSuccess);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : VOICE_MESSAGES.callOutboundFailed,
        );
      })
      .finally(() => {
        setIsBrowserCalling(false);
      });
  }

  function handleCallBack() {
    startCalling(async () => {
      const result = await triggerContactVoiceCallAction({
        phoneNumber: call!.phoneNumber,
        contactId: call!.contactId ?? undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
        return;
      }

      toast.success(result.message ?? VOICE_MESSAGES.callOutboundSuccess);
    });
  }

  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);

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
                {isLive ? (
                  <Badge variant="destructive">{VOICE_MESSAGES.callLiveBadge}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {softphone.enabled ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isBrowserCalling || softphone.status === "connecting"}
                onClick={handleBrowserCall}
              >
                {isBrowserCalling ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <PhoneIcon className="mr-2 size-4" />
                )}
                {isBrowserCalling
                  ? VOICE_MESSAGES.softphoneConnecting
                  : VOICE_MESSAGES.softphoneCallInBrowser}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={isCalling}
              onClick={handleCallBack}
            >
              {isCalling ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <PhoneIcon className="mr-2 size-4" />
              )}
              {isCalling ? VOICE_MESSAGES.callOutboundPending : VOICE_MESSAGES.callOutbound}
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {VOICE_MESSAGES.callStartedAt}
            </dt>
            <dd>{new Date(call.createdAt).toLocaleString()}</dd>
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
        </dl>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <h3 className="mb-3 text-sm font-medium">{VOICE_MESSAGES.callDetailTitle}</h3>
        {call.turns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {VOICE_MESSAGES.callNoTranscript}
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
