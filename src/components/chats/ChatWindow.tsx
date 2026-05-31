"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2Icon, MessageSquareIcon, SendIcon } from "lucide-react";

import { ChatAiStatus } from "@/components/chats/ChatAiStatus";
import { MessageHistory } from "@/components/chats/MessageHistory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { useSendChatMessage } from "@/hooks/use-send-chat-message";
import type { ConversationDetail } from "@/types/chat.types";

type ChatWindowProps = {
  conversation: ConversationDetail | null;
  aiEnabled: boolean | null;
  whatsappConnected: boolean;
};

export function ChatWindow({
  conversation,
  aiEnabled,
  whatsappConnected,
}: ChatWindowProps) {
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
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
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
      <div className="border-b px-4 py-3">
        <p className="font-medium">{conversation.contactName}</p>
        <p className="text-xs text-muted-foreground">
          {conversation.contactPhone}
        </p>
      </div>

      <ChatAiStatus aiEnabled={aiEnabled} onToggle={handleRefresh} />

      <MessageHistory messages={conversation.messages} />

      <div ref={bottomRef} />

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="border-t p-4"
      >
        {!whatsappConnected ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {CHAT_MESSAGES.whatsappNotConnected}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a reply..."
            rows={2}
            disabled={isLoading || !whatsappConnected}
            className="min-h-[72px] resize-none"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 self-end"
            disabled={isLoading || !whatsappConnected || !draft.trim()}
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
