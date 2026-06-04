"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2Icon, MessageSquareIcon, SendIcon } from "lucide-react";

import { ChatAiStatus } from "@/components/chats/ChatAiStatus";
import { MessageHistory } from "@/components/chats/MessageHistory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  getChannelBadgeLabel,
  getChannelBadgeVariant,
} from "@/features/chats/channel-ui";
import { Badge } from "@/components/ui/badge";
import { useSendChatMessage } from "@/hooks/use-send-chat-message";
import type { ConversationDetail } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { formatContactIdentifier } from "@/utils/contact-display";

type ChatWindowProps = {
  conversation: ConversationDetail | null;
  aiEnabled: boolean | null;
  channelConnected: boolean;
  channel: MessagingChannel;
};

function getChannelNotConnectedMessage(channel: MessagingChannel): string {
  if (channel === "instagram") {
    return CHAT_MESSAGES.instagramNotConnected;
  }

  if (channel === "telegram") {
    return CHAT_MESSAGES.telegramNotConnected;
  }

  if (channel === "website_forms") {
    return CHAT_MESSAGES.websiteFormsNotConnected;
  }

  return CHAT_MESSAGES.whatsappNotConnected;
}

export function ChatWindow({
  conversation,
  aiEnabled,
  channelConnected,
  channel,
}: ChatWindowProps) {
  const canSend = channelConnected;
  const channelNotConnectedMessage = getChannelNotConnectedMessage(channel);
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading } = useSendChatMessage({
    onSuccess: () => {
      setDraft("");
      router.refresh();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  function handleRefresh() {
    router.refresh();
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <MessageSquareIcon className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.selectConversation}
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!conversation || !draft.trim()) {
      return;
    }

    await sendMessage({
      conversationId: conversation.id,
      content: draft,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{conversation.contactName}</p>
          <Badge variant={getChannelBadgeVariant(conversation.channel)}>
            {getChannelBadgeLabel(conversation.channel)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatContactIdentifier(conversation.contactPhone)}
        </p>
      </div>

      <ChatAiStatus
        channel={conversation.channel}
        aiEnabled={aiEnabled}
        onToggle={handleRefresh}
      />

      <MessageHistory messages={conversation.messages} />

      <div ref={bottomRef} />

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="shrink-0 border-t p-3 sm:p-4"
      >
        {!canSend ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {channelNotConnectedMessage}
          </p>
        ) : conversation.channel === "website_forms" ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {CHAT_MESSAGES.websiteFormsReplyHint}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a reply..."
            rows={2}
            disabled={isLoading || !canSend}
            className="min-h-[72px] flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 self-end"
            disabled={isLoading || !canSend || !draft.trim()}
          >
            {isLoading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
