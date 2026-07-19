"use client";

import { useState } from "react";
import {
  BotIcon,
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
import { Textarea } from "@/components/ui/textarea";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";

export type VoiceCallMode = "ai";

export type VoiceCallModeSelection = {
  mode: VoiceCallMode;
  customPrompt?: string;
};

type VoiceCallModeDialogProps = {
  open: boolean;
  phoneNumber: string;
  pendingMode: VoiceCallMode | null;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (selection: VoiceCallModeSelection) => void;
};

export function VoiceCallModeDialog({
  open,
  phoneNumber,
  pendingMode,
  onOpenChange,
  onSelectMode,
}: VoiceCallModeDialogProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const normalizedPhone = phoneNumber.trim();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCustomPrompt("");
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{VOICE_MESSAGES.callModeAiTitle}</DialogTitle>
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
          <div className="rounded-xl border bg-muted/20 p-3">
            <label
              htmlFor="voice-call-ai-prompt"
              className="block text-sm font-medium"
            >
              {VOICE_MESSAGES.callModeAiPromptLabel}
            </label>
            <Textarea
              id="voice-call-ai-prompt"
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder={VOICE_MESSAGES.callModeAiPromptPlaceholder}
              rows={3}
              disabled={Boolean(pendingMode)}
              className="mt-2 resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {VOICE_MESSAGES.callModeAiPromptHint}
            </p>
          </div>

          <CallModeButton
            icon={BotIcon}
            title={VOICE_MESSAGES.callOutbound}
            description={VOICE_MESSAGES.callModeAiDescription}
            disabled={Boolean(pendingMode)}
            pending={pendingMode === "ai"}
            onClick={() =>
              onSelectMode({
                mode: "ai",
                customPrompt: customPrompt.trim() || undefined,
              })
            }
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
