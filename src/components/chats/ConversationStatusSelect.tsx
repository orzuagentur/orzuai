"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { updateConversationStatusAction } from "@/features/chats/actions/update-conversation";
import {
  CONVERSATION_STATUS_OPTIONS,
  getConversationStatusLabel,
} from "@/utils/conversation-status";
import type { ConversationStatus } from "@/types/database.types";

type ConversationStatusSelectProps = {
  conversationId: string;
  status: ConversationStatus;
};

export function ConversationStatusSelect({
  conversationId,
  status,
}: ConversationStatusSelectProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(nextStatus: ConversationStatus) {
    if (nextStatus === status) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateConversationStatusAction({
        conversationId,
        status: nextStatus,
      });

      if (result.success) {
        toast.success(CHAT_MESSAGES.statusUpdated);
        router.refresh();
        return;
      }

      toast.error(result.message ?? CHAT_MESSAGES.genericError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`conversation-status-${conversationId}`} className="sr-only">
        {CHAT_MESSAGES.statusLabel}
      </Label>
      {isSaving ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      ) : null}
      <select
        id={`conversation-status-${conversationId}`}
        value={status}
        disabled={isSaving}
        onChange={(event) => {
          void handleChange(event.target.value as ConversationStatus);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        aria-label={CHAT_MESSAGES.statusLabel}
      >
        {CONVERSATION_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {getConversationStatusLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
