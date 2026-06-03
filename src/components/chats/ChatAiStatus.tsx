"use client";

import { BotIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import { useToggleChatAi } from "@/hooks/use-toggle-chat-ai";
import type { MessagingChannel } from "@/types/database.types";

type ChatAiStatusProps = {
  channel: MessagingChannel;
  aiEnabled: boolean | null;
  onToggle?: (enabled: boolean) => void;
};

export function ChatAiStatus({ channel, aiEnabled, onToggle }: ChatAiStatusProps) {
  const { toggleAi, isLoading } = useToggleChatAi({
    onSuccess: onToggle,
  });

  const isEnabled = aiEnabled === true;
  const isConfigured = aiEnabled !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <BotIcon className="size-4 text-primary" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">AI Auto Reply</p>
          <p className="text-xs text-muted-foreground">
            {isConfigured
              ? isEnabled
                ? `AI is responding on ${getChannelBadgeLabel(channel)}.`
                : `Manual replies only on ${getChannelBadgeLabel(channel)}.`
              : `Configure ${getChannelBadgeLabel(channel)} AI in AI Assistant settings.`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
        {isConfigured ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => {
              void toggleAi({ enabled: !isEnabled, channel });
            }}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Updating...
              </>
            ) : isEnabled ? (
              "Disable AI"
            ) : (
              "Enable AI"
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
