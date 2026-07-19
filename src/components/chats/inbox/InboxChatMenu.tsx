"use client";

import { useState } from "react";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { deleteContactAction } from "@/features/contacts/actions/delete-contact";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChatHeaderActionButtonClassName } from "@/features/chats/chat-theme";
import type { ConversationDetail } from "@/types/chat.types";

type InboxChatMenuProps = {
  conversation: ConversationDetail;
  onContactDeleted?: () => void;
};

export function InboxChatMenu({
  conversation,
  onContactDeleted,
}: InboxChatMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteContact() {
    if (!conversation.contactId) {
      toast.error(CONTACTS_MESSAGES.contactDeleteFailed);
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteContactAction({
        contactId: conversation.contactId,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.contactDeleted);
      setDeleteOpen(false);
      onContactDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={getChatHeaderActionButtonClassName(conversation.channel)}
            aria-label={CHAT_MESSAGES.chatMenuLabel}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{CHAT_MESSAGES.chatMenuLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!conversation.contactId}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {CHAT_MESSAGES.deleteContactFromChat}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{CONTACTS_MESSAGES.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {CONTACTS_MESSAGES.deleteConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {CONTACTS_MESSAGES.cancelEdit}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDeleteContact();
              }}
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                CONTACTS_MESSAGES.deleteContact
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
