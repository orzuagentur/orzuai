"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, Loader2Icon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { MessageHistory, type MessageHistoryHandle } from "@/components/chats/MessageHistory";
import { MessageHistorySkeleton } from "@/components/chats/MessageHistorySkeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SMS_MESSAGES } from "@/features/sms/constants";
import { cn } from "@/lib/utils";
import type { ChatMessageData, ConversationDetail } from "@/types/chat.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  createOptimisticChatMessage,
  createOptimisticMessageId,
} from "@/utils/optimistic-chat-message";

type SmsThreadPanelProps = {
  conversation: ConversationDetail | null;
  draftPhone?: string;
  isLoadingConversation?: boolean;
  onBack?: () => void;
  onOptimisticMessage?: (message: ChatMessageData) => void;
  onClearPendingMessage?: (messageId: string) => void;
  onSendFailed?: (messageId: string) => void;
  onConversationViewed?: () => void;
  onReadProgress?: (readAt: string) => void;
  onSentToNewNumber?: (phoneNumber: string) => void;
  className?: string;
};

export function SmsThreadPanel({
  conversation,
  draftPhone = "",
  isLoadingConversation = false,
  onBack,
  onOptimisticMessage,
  onClearPendingMessage,
  onSendFailed,
  onConversationViewed,
  onReadProgress,
  onSentToNewNumber,
  className,
}: SmsThreadPanelProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const historyRef = useRef<MessageHistoryHandle>(null);

  const phoneNumber = conversation?.contactPhone?.trim() || draftPhone.trim();
  const displayName =
    conversation?.contactName?.trim() ||
    (phoneNumber ? formatContactIdentifier(phoneNumber) : SMS_MESSAGES.newThreadTitle);

  useEffect(() => {
    if (conversation?.id) {
      onConversationViewed?.();
    }
  }, [conversation?.id, onConversationViewed]);

  useEffect(() => {
    historyRef.current?.scrollToEnd({ instant: false });
  }, [conversation?.messages.length]);

  async function handleSend() {
    const body = message.trim();

    if (!body || !phoneNumber) {
      return;
    }

    const pendingId = createOptimisticMessageId();
    const optimisticMessage = createOptimisticChatMessage({
      id: pendingId,
      conversationId: conversation?.id ?? pendingId,
      content: body,
      channel: "voice",
    });

    onOptimisticMessage?.(optimisticMessage);
    setIsSending(true);

    try {
      const response = await fetch("/api/voice/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, message: body }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!result.success) {
        throw new Error(result.message ?? SMS_MESSAGES.composeFailed);
      }

      setMessage("");
      toast.success(SMS_MESSAGES.composeSuccess);
      onClearPendingMessage?.(pendingId);

      if (!conversation) {
        onSentToNewNumber?.(phoneNumber);
      }
    } catch (error) {
      onSendFailed?.(pendingId);
      toast.error(
        error instanceof Error ? error.message : SMS_MESSAGES.composeFailed,
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">{SMS_MESSAGES.threadBack}</span>
          </Button>
        ) : null}
        <ContactAvatar name={displayName} className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{displayName}</h2>
          {phoneNumber ? (
            <p className="truncate text-sm text-muted-foreground">
              {formatContactIdentifier(phoneNumber)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoadingConversation && !conversation ? (
          <MessageHistorySkeleton className="h-full" />
        ) : conversation ? (
          <MessageHistory
            ref={historyRef}
            conversationId={conversation.id}
            messages={conversation.messages}
            variant="inbox"
            contactName={displayName}
            lastReadAt={conversation.lastReadAt}
            onReadProgress={onReadProgress}
            className="h-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {SMS_MESSAGES.newThreadDescription}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-4">
        {!phoneNumber ? (
          <p className="mb-3 text-sm text-muted-foreground">{SMS_MESSAGES.phoneLabel}</p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={SMS_MESSAGES.composePlaceholder}
            rows={3}
            className="min-h-0 flex-1 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={isSending || !message.trim() || !phoneNumber}
            onClick={() => void handleSend()}
          >
            {isSending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
