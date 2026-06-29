"use client";

import {
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";
import { summarizeContactCalls } from "@/utils/voice-contact-calls";
import {
  formatVoiceCallDuration,
  isMissedVoiceCallStatus,
} from "@/utils/voice-call-display";

type VoiceContactCallHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  calls: VoiceInboxCallListItem[];
  activeCallId?: string | null;
  onSelectCall?: (callId: string) => void;
};

export function VoiceContactCallHistoryDialog({
  open,
  onOpenChange,
  contactName,
  calls,
  activeCallId,
  onSelectCall,
}: VoiceContactCallHistoryDialogProps) {
  const summary = summarizeContactCalls(calls);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>{VOICE_MESSAGES.callHistoryTitle}</DialogTitle>
          <DialogDescription>{contactName}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 border-b px-4 py-3 text-sm">
          <Stat label={VOICE_MESSAGES.callHistoryTotalCalls} value={String(summary.totalCalls)} />
          <Stat
            label={VOICE_MESSAGES.callHistoryTotalDuration}
            value={formatVoiceCallDuration(summary.totalDurationSeconds)}
          />
          <Stat
            label={VOICE_MESSAGES.callHistoryCompleted}
            value={String(summary.completedCalls)}
          />
          <Stat label={VOICE_MESSAGES.callHistoryMissed} value={String(summary.missedCalls)} />
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
          {calls.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {VOICE_MESSAGES.callHistoryEmpty}
            </p>
          ) : (
            <ul className="space-y-1">
              {calls.map((call) => {
                const DirectionIcon =
                  call.direction === "inbound" ? PhoneIncomingIcon : PhoneOutgoingIcon;
                const createdAt = new Date(call.createdAt);
                const isActive = call.id === activeCallId;

                return (
                  <li key={call.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCall?.(call.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-muted",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          call.direction === "inbound"
                            ? "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
                            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
                        )}
                      >
                        <DirectionIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {call.direction === "inbound"
                            ? VOICE_MESSAGES.callDirectionInbound
                            : VOICE_MESSAGES.callDirectionOutbound}
                          {isMissedVoiceCallStatus(call.status)
                            ? ` · ${VOICE_MESSAGES.callHistoryMissedLabel}`
                            : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {createdAt.toLocaleString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{formatVoiceCallDuration(call.durationSeconds)}</p>
                        {call.aiHandled ? (
                          <p className="mt-0.5">{VOICE_MESSAGES.callAiHandled}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
