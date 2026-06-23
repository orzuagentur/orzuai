"use client";

import { Input } from "@/components/ui/input";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { InboxChatComposer } from "@/components/chats/inbox/InboxChatComposer";
import type { CannedResponseItem } from "@/types/canned-response.types";

type EmailChatComposerProps = {
  conversationId: string;
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
};

export function EmailChatComposer({
  subject,
  onSubjectChange,
  ...composerProps
}: EmailChatComposerProps) {
  const showSubjectField = composerProps.composerTab === "reply";
  const canSendEmail =
    composerProps.canSend &&
    subject.trim().length > 0 &&
    composerProps.draft.trim().length > 0;

  return (
    <div className="flex min-w-0 flex-col">
      {showSubjectField ? (
        <div className="border-b px-3 py-2">
          <label className="sr-only" htmlFor="email-composer-subject">
            {CHAT_MESSAGES.emailSubjectLabel}
          </label>
          <Input
            id="email-composer-subject"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder={CHAT_MESSAGES.emailSubjectPlaceholder}
            disabled={!composerProps.canSend || composerProps.isSending}
            className="h-9 border-0 bg-muted/40 px-3 shadow-none focus-visible:ring-1"
            maxLength={998}
          />
        </div>
      ) : null}

      <InboxChatComposer
        {...composerProps}
        channel="email"
        canSend={canSendEmail}
        websiteFormsHint={false}
        isSendingMedia={false}
        composerPlaceholder={CHAT_MESSAGES.emailBodyPlaceholder}
        hideMediaActions
      />
    </div>
  );
}
