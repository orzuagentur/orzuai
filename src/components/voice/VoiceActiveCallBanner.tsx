"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  isActiveVoiceCallStatus,
  isAiVoiceCall,
} from "@/utils/voice-call-display";

type VoiceActiveCallBannerProps = {
  call: VoiceInboxCallListItem;
};

export function VoiceActiveCallBanner({ call }: VoiceActiveCallBannerProps) {
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);

  return (
    <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
            </span>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
              {VOICE_MESSAGES.callLiveBanner}
            </p>
          </div>
          <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">
            {displayName} · {VOICE_MESSAGES.callLiveBannerDescription}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`${DASHBOARD_ROUTES.voice}?call=${call.id}`}>
            {VOICE_MESSAGES.callLiveBadge}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function VoiceActiveAiCallChip({ call }: VoiceActiveCallBannerProps) {
  const displayName =
    call.contactName ?? formatContactIdentifier(call.phoneNumber);

  return (
    <div className="shrink-0 border-b px-4 py-2">
      <Link
        href={`${DASHBOARD_ROUTES.voice}?call=${call.id}`}
        className="flex items-center gap-2 rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-1.5 text-xs transition-colors hover:bg-red-100/80 dark:border-red-900/60 dark:bg-red-950/20 dark:hover:bg-red-950/40"
      >
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-600" />
        </span>
        <span className="font-medium text-red-800 dark:text-red-200">
          {VOICE_MESSAGES.callLiveAiChip}
        </span>
        <span className="truncate text-red-700/90 dark:text-red-300/90">
          {displayName}
        </span>
      </Link>
    </div>
  );
}

export function findFirstActiveVoiceCall(
  calls: VoiceInboxCallListItem[],
): VoiceInboxCallListItem | null {
  return calls.find((call) => isActiveVoiceCallStatus(call.status)) ?? null;
}

export function findFirstActiveAiVoiceCall(
  calls: VoiceInboxCallListItem[],
): VoiceInboxCallListItem | null {
  return (
    calls.find(
      (call) => isActiveVoiceCallStatus(call.status) && isAiVoiceCall(call),
    ) ?? null
  );
}

export function getActiveVoiceCallIds(
  calls: VoiceInboxCallListItem[],
): Set<string> {
  return new Set(
    calls
      .filter((call) => isActiveVoiceCallStatus(call.status))
      .map((call) => call.id),
  );
}
