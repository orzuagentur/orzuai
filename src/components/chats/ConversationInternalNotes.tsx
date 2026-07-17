"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, LockIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { updateConversationInternalNoteAction } from "@/features/chats/actions/update-conversation";
import { cn } from "@/lib/utils";

type ConversationInternalNotesProps = {
  conversationId: string;
  initialNote: string | null;
  layout?: "default" | "compact";
  onSaved?: (note: string | null) => void;
};

export function ConversationInternalNotes({
  conversationId,
  initialNote,
  layout = "default",
  onSaved,
}: ConversationInternalNotesProps) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNote(initialNote ?? "");
  }, [conversationId, initialNote]);

  async function persistNote(nextNote: string, successMessage: string) {
    setIsSaving(true);

    try {
      const result = await updateConversationInternalNoteAction({
        conversationId,
        internalNote: nextNote,
      });

      if (!result.success) {
        toast.error(result.message ?? CHAT_MESSAGES.genericError);
        return false;
      }

      const stored = nextNote.trim() || null;
      setNote(nextNote);
      onSaved?.(stored);
      toast.success(successMessage);
      router.refresh();
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await persistNote(note, CHAT_MESSAGES.internalNoteSaved);
  }

  async function handleDelete() {
    await persistNote("", CHAT_MESSAGES.internalNoteDeleted);
  }

  const hasNote = note.trim().length > 0;

  if (layout === "compact") {
    return (
      <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-50/40 shadow-sm dark:border-amber-900/40 dark:from-amber-950/40 dark:to-amber-950/10">
        <div className="flex items-start justify-between gap-3 border-b border-amber-200/60 px-4 py-3 dark:border-amber-900/30">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <StickyNoteIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {CHAT_MESSAGES.internalNotesTitle}
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
                {CHAT_MESSAGES.internalNotesDescription}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100/80 px-2 py-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <LockIcon className="size-3" />
            {CHAT_MESSAGES.internalNotesPrivateBadge}
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <Label htmlFor={`internal-note-${conversationId}`} className="sr-only">
            {CHAT_MESSAGES.internalNotesTitle}
          </Label>
          <Textarea
            id={`internal-note-${conversationId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={CHAT_MESSAGES.internalNotesPlaceholder}
            rows={5}
            className={cn(
              "min-h-[120px] resize-y border-amber-200/70 bg-white/80 text-sm leading-relaxed",
              "placeholder:text-amber-900/35 focus-visible:border-amber-300 focus-visible:ring-amber-200/60",
              "dark:border-amber-900/40 dark:bg-amber-950/20 dark:placeholder:text-amber-100/30",
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-amber-800/70 dark:text-amber-200/60">
              {CHAT_MESSAGES.internalNotesHint}
            </p>
            <div className="flex items-center gap-2">
              {hasNote ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={isSaving}
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  <Trash2Icon className="size-3.5" />
                  {CHAT_MESSAGES.internalNotesDelete}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
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
        </div>
      </div>
    );
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
        <div className="flex items-center gap-2">
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
          {hasNote ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={isSaving}
              onClick={() => {
                void handleDelete();
              }}
            >
              <Trash2Icon className="size-3.5" />
              {CHAT_MESSAGES.internalNotesDelete}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
