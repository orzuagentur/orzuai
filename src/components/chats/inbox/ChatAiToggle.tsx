"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { isInboxMessagingChannel } from "@/features/integrations/constants";
import { useChannelAiEnabled } from "@/hooks/use-channel-ai-enabled";
import { useToggleChatAi } from "@/hooks/use-toggle-chat-ai";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type ChatAiToggleProps = {
  channel: MessagingChannel;
  aiEnabled: boolean | null;
  onEnabledChange?: (enabled: boolean) => void;
  className?: string;
};

export function ChatAiToggle({
  channel,
  aiEnabled: serverAiEnabled,
  onEnabledChange,
  className,
}: ChatAiToggleProps) {
  const aiEnabled = useChannelAiEnabled(channel, serverAiEnabled);
  const { toggleAi, isLoading } = useToggleChatAi({
    onSuccess: onEnabledChange,
  });

  const isOn = aiEnabled === true;
  const canToggle = aiEnabled !== null && isInboxMessagingChannel(channel);

  if (!canToggle) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-1.5",
        className,
      )}
      title={CHAT_MESSAGES.aiAutoReply}
    >
      <SparklesIcon
        className={cn(
          "size-3.5 shrink-0",
          isOn ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={CHAT_MESSAGES.aiAutoReplyToggleLabel}
        disabled={isLoading}
        onClick={() => {
          void toggleAi({ enabled: !isOn, channel });
        }}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors",
          isOn
            ? "border-primary bg-primary"
            : "border-muted-foreground/35 bg-muted",
          isLoading && "cursor-not-allowed opacity-70",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 size-2.5 rounded-full bg-white shadow-sm transition-transform",
            isOn ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
        {isLoading ? (
          <Loader2Icon className="absolute inset-0 m-auto size-2.5 animate-spin text-white" />
        ) : null}
      </button>
    </div>
  );
}
