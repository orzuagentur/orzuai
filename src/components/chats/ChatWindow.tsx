"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react";

import { AiSuggestReplyPanel } from "@/components/chats/AiSuggestReplyPanel";
import { ChatCrmAssistantBar } from "@/components/chats/ChatCrmAssistantBar";
import { QuickRepliesPicker } from "@/components/chats/QuickRepliesPicker";
import { ChatAiStatus } from "@/components/chats/ChatAiStatus";
import { InboxChatComposer } from "@/components/chats/inbox/InboxChatComposer";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { ConversationInternalNotes } from "@/components/chats/ConversationInternalNotes";
import { ConversationStatusSelect } from "@/components/chats/ConversationStatusSelect";
import { MessageHistory } from "@/components/chats/MessageHistory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { Badge } from "@/components/ui/badge";
import { useSendChatMessage } from "@/hooks/use-send-chat-message";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ConversationDetail } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { formatContactIdentifier } from "@/utils/contact-display";

type ChatWindowProps = {
  conversation: ConversationDetail | null;
  aiEnabled: boolean | null;
  channelConnected: boolean;
  channel: MessagingChannel;
  cannedResponses: CannedResponseItem[];
  layout?: "default" | "inbox";
  draft?: string;
  onDraftChange?: (value: string) => void;
  suggestReplyOpen?: boolean;
  onSuggestReplyOpenChange?: (open: boolean) => void;
  className?: string;
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
  cannedResponses,
  layout = "default",
  draft: controlledDraft,
  onDraftChange,
  suggestReplyOpen: controlledSuggestOpen,
  onSuggestReplyOpenChange,
  className,
}: ChatWindowProps) {
  const canSend = channelConnected;
  const channelNotConnectedMessage = getChannelNotConnectedMessage(channel);
  const router = useRouter();
  const [internalDraft, setInternalDraft] = useState("");
  const [composerTab, setComposerTab] = useState<"reply" | "note">("reply");
  const [internalSuggestOpen, setInternalSuggestOpen] = useState(false);
  const suggestOpen = controlledSuggestOpen ?? internalSuggestOpen;
  const setSuggestOpen = onSuggestReplyOpenChange ?? setInternalSuggestOpen;
  const bottomRef = useRef<HTMLDivElement>(null);
  const draft = controlledDraft ?? internalDraft;
  const setDraft = onDraftChange ?? setInternalDraft;
  const isInboxLayout = layout === "inbox";

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
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center",
          className,
        )}
      >
        <MessageSquareIcon className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.selectConversationOverview}
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!conversation || !draft.trim() || composerTab !== "reply") {
      return;
    }

    await sendMessage({
      conversationId: conversation.id,
      content: draft,
    });
  }

  async function handleInboxSend() {
    if (!conversation || !draft.trim() || composerTab !== "reply") {
      return;
    }

    await sendMessage({
      conversationId: conversation.id,
      content: draft,
    });
  }

  if (isInboxLayout) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
        <div className="shrink-0 border-b bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{conversation.contactName}</p>
                <Badge
                  variant="outline"
                  className={`gap-1 ${getChannelBadgeClassName(conversation.channel)}`}
                >
                  <ChannelBrandIcon
                    channel={conversation.channel}
                    className="size-3.5"
                  />
                  {getChannelBadgeLabel(conversation.channel)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatContactIdentifier(conversation.contactPhone)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <StarIcon className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <MessageHistory
              messages={conversation.messages}
              variant="inbox"
              className="min-h-0 flex-1 overflow-y-auto"
              bottomRef={bottomRef}
            />

            <InboxChatComposer
              conversationId={conversation.id}
              internalNote={conversation.internalNote}
              draft={draft}
              onDraftChange={setDraft}
              cannedResponses={cannedResponses}
              canSend={canSend}
              channelNotConnectedMessage={channelNotConnectedMessage}
              websiteFormsHint={conversation.channel === "website_forms"}
              isSending={isLoading}
              composerTab={composerTab}
              onComposerTabChange={setComposerTab}
              onSubmit={() => {
                void handleInboxSend();
              }}
              onOpenAiSuggest={() => setSuggestOpen(true)}
            />
          </div>

          <AiSuggestReplyPanel
            conversationId={conversation.id}
            open={suggestOpen}
            onOpenChange={setSuggestOpen}
            onUseSuggestion={setDraft}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-1", className)}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{conversation.contactName}</p>
              <Badge
                variant="outline"
                className={`gap-1 ${getChannelBadgeClassName(conversation.channel)}`}
              >
                <ChannelBrandIcon
                  channel={conversation.channel}
                  className="size-3.5"
                />
                {getChannelBadgeLabel(conversation.channel)}
              </Badge>
            </div>
            <ConversationStatusSelect
              conversationId={conversation.id}
              status={conversation.status}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatContactIdentifier(conversation.contactPhone)}
          </p>
        </div>

        <ChatCrmAssistantBar conversationId={conversation.id} />

        <ChatAiStatus
          channel={conversation.channel}
          aiEnabled={aiEnabled}
          onToggle={handleRefresh}
        />

        <ConversationInternalNotes
          conversationId={conversation.id}
          initialNote={conversation.internalNote}
        />

        <MessageHistory messages={conversation.messages} className="min-h-0 flex-1" />

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
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            <QuickRepliesPicker
              responses={cannedResponses}
              disabled={!canSend}
              onSelect={(content) => setDraft(content)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSuggestOpen(true)}
              disabled={!canSend}
            >
              <SparklesIcon className="size-3.5" />
              AI suggest
            </Button>
          </div>
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

      <AiSuggestReplyPanel
        conversationId={conversation.id}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        onUseSuggestion={setDraft}
      />
    </div>
  );
}
