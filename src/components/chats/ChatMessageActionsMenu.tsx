"use client";

import { useState } from "react";
import {
  CopyIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteChatMessageAction } from "@/features/chats/actions/delete-chat-message";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChatMessageActionHoverClassName } from "@/features/chats/chat-theme";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import { parseMediaMessage } from "@/utils/chat-media";
import { isChatMessageDeletedForAll } from "@/utils/chat";

type ChatMessageActionsMenuProps = {
  message: ChatMessageData;
  isOutgoing: boolean;
  onMessageRemoved: (messageId: string) => void;
};

export function ChatMessageActionsMenu({
  message,
  isOutgoing,
  onMessageRemoved,
}: ChatMessageActionsMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeleted = isChatMessageDeletedForAll(message);
  const { text } = parseMediaMessage(message.content);
  const canCopy = Boolean(text.trim()) && !isDeleted;

  async function handleCopy() {
    if (!canCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(CHAT_MESSAGES.messageCopied);
    } catch {
      toast.error(CHAT_MESSAGES.messageCopyFailed);
    }
  }

  async function handleDeleteForMe() {
    setIsDeleting(true);

    try {
      const result = await deleteChatMessageAction({
        messageId: message.id,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      onMessageRemoved(message.id);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isDeleted) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "size-7 shrink-0 opacity-70 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 data-[state=open]:opacity-100",
            isOutgoing ? getChatMessageActionHoverClassName(true) : "",
          )}
          aria-label={CHAT_MESSAGES.messageActionsLabel}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <MoreHorizontalIcon className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {canCopy ? (
          <DropdownMenuItem onClick={() => void handleCopy()}>
            <CopyIcon className="size-4" />
            {CHAT_MESSAGES.messageCopy}
          </DropdownMenuItem>
        ) : null}
        {canCopy ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleDeleteForMe()}
        >
          <Trash2Icon className="size-4" />
          {CHAT_MESSAGES.messageDeleteForMe}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
