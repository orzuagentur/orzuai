"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, StickyNoteIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { updateConversationInternalNoteAction } from "@/features/chats/actions/update-conversation";

type ConversationInternalNotesProps = {
  conversationId: string;
  initialNote: string | null;
};

export function ConversationInternalNotes({
  conversationId,
  initialNote,
}: ConversationInternalNotesProps) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await updateConversationInternalNoteAction({
        conversationId,
        internalNote: note,
      });

      if (result.success) {
        toast.success(CHAT_MESSAGES.internalNoteSaved);
        router.refresh();
        return;
      }

      toast.error(result.message ?? CHAT_MESSAGES.genericError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="border-b bg-muted/20 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <StickyNoteIcon className="size-4 text-muted-foreground" />
        {CHAT_MESSAGES.internalNotesTitle}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        {CHAT_MESSAGES.internalNotesDescription}
      </p>
      <div className="space-y-2">
        <Label htmlFor={`internal-note-${conversationId}`} className="sr-only">
          {CHAT_MESSAGES.internalNotesTitle}
        </Label>
        <Textarea
          id={`internal-note-${conversationId}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={CHAT_MESSAGES.internalNotesPlaceholder}
          rows={2}
          className="resize-none bg-background"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving}
          onClick={() => {
            void handleSave();
          }}
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {CHAT_MESSAGES.internalNotesSave}
        </Button>
      </div>
    </div>
  );
}
