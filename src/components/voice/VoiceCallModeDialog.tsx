"use client";

import {
  BotIcon,
  HeadphonesIcon,
  Loader2Icon,
  type LucideIcon,
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

export type VoiceCallMode = "ai" | "human";

type VoiceCallModeDialogProps = {
  open: boolean;
  phoneNumber: string;
  humanAvailable: boolean;
  pendingMode: VoiceCallMode | null;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: VoiceCallMode) => void;
};

export function VoiceCallModeDialog({
  open,
  phoneNumber,
  humanAvailable,
  pendingMode,
  onOpenChange,
  onSelectMode,
}: VoiceCallModeDialogProps) {
  const normalizedPhone = phoneNumber.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{VOICE_MESSAGES.callModeTitle}</DialogTitle>
          <DialogDescription>
            {normalizedPhone
              ? VOICE_MESSAGES.callModeDescription.replace(
                  "{phone}",
                  normalizedPhone,
                )
              : VOICE_MESSAGES.callModeDescriptionFallback}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <CallModeButton
            icon={BotIcon}
            title={VOICE_MESSAGES.callModeAiTitle}
            description={VOICE_MESSAGES.callModeAiDescription}
            disabled={Boolean(pendingMode)}
            pending={pendingMode === "ai"}
            onClick={() => onSelectMode("ai")}
          />
          <CallModeButton
            icon={HeadphonesIcon}
            title={VOICE_MESSAGES.callModeHumanTitle}
            description={
              humanAvailable
                ? VOICE_MESSAGES.callModeHumanDescription
                : VOICE_MESSAGES.callModeHumanUnavailable
            }
            disabled={Boolean(pendingMode) || !humanAvailable}
            pending={pendingMode === "human"}
            onClick={() => onSelectMode("human")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CallModeButton({
  icon: Icon,
  title,
  description,
  disabled,
  pending,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60",
        pending && "border-primary bg-primary/5",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {pending ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : (
          <Icon className="size-5" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
