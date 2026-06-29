"use client";

import { useEffect, useState } from "react";

import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { fetchConversationDetailAction } from "@/features/chats/actions/fetch-conversation-detail";
import type { ConversationDetail } from "@/types/chat.types";

type VoiceInboxDetailsPanelProps = {
  conversationId: string | null;
  className?: string;
};

export function VoiceInboxDetailsPanel({
  conversationId,
  className,
}: VoiceInboxDetailsPanelProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      return;
    }

    setIsLoading(true);

    void fetchConversationDetailAction({ conversationId })
      .then((result) => {
        if (result.success) {
          setConversation(result.conversation);
        } else {
          setConversation(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  if (!conversationId) {
    return null;
  }

  if (isLoading && !conversation) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  return <InboxDetailsPanel conversation={conversation} className={className} />;
}
