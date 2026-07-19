"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  ReplyIcon,
  SendIcon,
  SparklesIcon,
  StickyNoteIcon,
  XIcon,
} from "lucide-react";

import { InboxContactNotesCard } from "@/components/chats/inbox/InboxContactNotesCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  getChatComposerFieldClassName,
  getChatComposerShellClassName,
  getChatSendButtonClassName,
} from "@/features/chats/chat-theme";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";

type EmailChatComposerProps = {
  conversationId: string;
  contactId?: string | null;
  internalNote: string | null;
  subject: string;
  onSubjectChange: (value: string) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  cannedResponses: CannedResponseItem[];
  canSend: boolean;
  channelNotConnectedMessage: string;
  isSending: boolean;
  composerTab: "reply" | "note";
  onComposerTabChange: (tab: "reply" | "note") => void;
  onSubmit: () => void;
  onOpenAiSuggest: () => void;
  onQuickRepliesOpen?: () => void;
  /** When true, opens the inline reply composer (e.g. Reply on a message). */
  composeOpen?: boolean;
  onComposeOpenChange?: (open: boolean) => void;
};

export function EmailChatComposer({
  contactId = null,
  subject,
  onSubjectChange,
  draft,
  onDraftChange,
  canSend,
  channelNotConnectedMessage,
  isSending,
  composerTab,
  onComposerTabChange,
  onSubmit,
  onOpenAiSuggest,
  composeOpen,
  onComposeOpenChange,
}: EmailChatComposerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const isControlled = typeof composeOpen === "boolean";
  const isComposing = isControlled ? composeOpen : internalOpen;

  function setComposing(open: boolean) {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onComposeOpenChange?.(open);
  }

  useEffect(() => {
    if (composerTab === "note") {
      setNoteDialogOpen(true);
      onComposerTabChange("reply");
    }
  }, [composerTab, onComposerTabChange]);

  useEffect(() => {
    if (!isComposing) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      bodyRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isComposing]);

  const canSubmit =
    canSend && subject.trim().length > 0 && draft.trim().length > 0;

  function handleDiscard() {
    onDraftChange("");
    setComposing(false);
  }

  function handleSubmit() {
    if (!canSubmit || isSending) {
      return;
    }
    onSubmit();
    if (!isControlled) {
      setInternalOpen(false);
    }
  }

  if (!isComposing) {
    return (
      <div
        className={cn("mt-auto shrink-0", getChatComposerShellClassName("email"))}
        data-inbox-email-composer
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          {!canSend ? (
            <p className="w-full text-xs text-[#5f6368]">
              {channelNotConnectedMessage}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn("h-9 gap-1.5 rounded-full px-4", getChatSendButtonClassName("email"))}
            disabled={!canSend || isSending}
            onClick={() => setComposing(true)}
          >
            <ReplyIcon className="size-3.5" />
            {CHAT_MESSAGES.emailReplyAction}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-full border-[#dadce0] px-3 text-[#202124]"
            disabled={!contactId || isSending}
            onClick={() => setNoteDialogOpen(true)}
          >
            <StickyNoteIcon className="size-3.5" />
            {CHAT_MESSAGES.contactNotesTitle}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5 rounded-full text-[#5f6368]"
            disabled={!canSend || isSending}
            onClick={onOpenAiSuggest}
          >
            <SparklesIcon className="size-3.5" />
            {CHAT_MESSAGES.suggestReplyButton}
          </Button>
          <p className="ml-auto hidden text-xs text-[#5f6368] sm:block">
            {CHAT_MESSAGES.emailComposeHint}
          </p>
        </div>

        <InboxContactNotesCard
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          contactId={contactId}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("mt-auto shrink-0", getChatComposerShellClassName("email"))}
      data-inbox-email-composer
    >
      <div className="space-y-0 border-t border-[#e0e3e8] bg-white dark:bg-[#202124]">
        <div className="flex items-center justify-between gap-2 border-b border-[#e0e3e8] px-3 py-2">
          <p className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">
            {CHAT_MESSAGES.emailReplyAction}
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-[#5f6368]"
            aria-label={CHAT_MESSAGES.emailDiscardAction}
            disabled={isSending}
            onClick={handleDiscard}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {!canSend ? (
          <p className="px-3 py-2 text-xs text-[#5f6368]">
            {channelNotConnectedMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-2 border-b border-[#e0e3e8] px-3 py-1.5">
          <label
            htmlFor="email-composer-subject"
            className="shrink-0 text-xs font-medium text-[#5f6368]"
          >
            {CHAT_MESSAGES.emailSubjectLabel}
          </label>
          <Input
            id="email-composer-subject"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={CHAT_MESSAGES.emailSubjectPlaceholder}
            disabled={!canSend || isSending}
            className="h-8 border-0 bg-transparent px-0 text-sm text-[#202124] shadow-none focus-visible:ring-0 dark:text-[#e8eaed]"
            maxLength={998}
          />
        </div>

        <div className={cn("mx-3 my-3", getChatComposerFieldClassName("email"))}>
          <Textarea
            ref={bodyRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={CHAT_MESSAGES.emailBodyPlaceholder}
            disabled={!canSend || isSending}
            rows={6}
            className="min-h-[9rem] resize-y border-0 bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-[#202124] shadow-none focus-visible:ring-0 dark:text-[#e8eaed]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            className={cn("h-9 gap-1.5 rounded-full px-5", getChatSendButtonClassName("email"))}
            disabled={!canSubmit || isSending}
            onClick={handleSubmit}
          >
            {isSending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
            {CHAT_MESSAGES.emailSendAction}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 text-[#5f6368]"
            disabled={isSending}
            onClick={handleDiscard}
          >
            {CHAT_MESSAGES.emailDiscardAction}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5 text-[#5f6368]"
            disabled={!canSend || isSending}
            onClick={onOpenAiSuggest}
          >
            <SparklesIcon className="size-3.5" />
            {CHAT_MESSAGES.suggestReplyButton}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto size-8 text-[#5f6368]"
            disabled={!contactId || isSending}
            aria-label={CHAT_MESSAGES.contactNotesTitle}
            onClick={() => setNoteDialogOpen(true)}
          >
            <StickyNoteIcon className="size-4" />
          </Button>
        </div>
      </div>

      <InboxContactNotesCard
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        contactId={contactId}
      />
    </div>
  );
}
