"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  getContactNotesAction,
  updateContactNotesAction,
} from "@/features/contacts/actions/update-contact-notes";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { CHAT_MESSAGES } from "@/features/chats/constants";

type InboxContactNotesCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
};

function splitNotes(notes: string | null): string[] {
  if (!notes?.trim()) {
    return [];
  }

  return notes
    .split(/\n\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinNotes(entries: string[]): string {
  return entries.map((entry) => entry.trim()).filter(Boolean).join("\n\n");
}

export function InboxContactNotesCard({
  open,
  onOpenChange,
  contactId,
}: InboxContactNotesCardProps) {
  const [contactName, setContactName] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !contactId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsAdding(false);
    setDraft("");

    void getContactNotesAction(contactId).then((result) => {
      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!result.success) {
        toast.error(result.message);
        setEntries([]);
        setContactName("");
        return;
      }

      setContactName(result.contactName);
      setEntries(splitNotes(result.notes));
    });

    return () => {
      cancelled = true;
    };
  }, [open, contactId]);

  async function persist(nextEntries: string[]) {
    if (!contactId) {
      return false;
    }

    setIsSaving(true);
    try {
      const result = await updateContactNotesAction({
        contactId,
        notes: joinNotes(nextEntries),
      });

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      setEntries(nextEntries);
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdd() {
    const text = draft.trim();
    if (!text) {
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const line = `[${timestamp}] ${text}`;
    const ok = await persist([...entries, line]);

    if (ok) {
      setDraft("");
      setIsAdding(false);
      toast.success(CHAT_MESSAGES.contactNoteSaved);
    }
  }

  async function handleDelete(index: number) {
    const next = entries.filter((_, i) => i !== index);
    const ok = await persist(next);
    if (ok) {
      toast.success(CHAT_MESSAGES.contactNoteDeleted);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                <StickyNoteIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base">
                  {CONTACTS_MESSAGES.notesLabel}
                </DialogTitle>
                <DialogDescription className="truncate text-xs">
                  {contactName
                    ? CHAT_MESSAGES.contactNotesFor(contactName)
                    : CHAT_MESSAGES.contactNotesTitle}
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8 shrink-0"
              disabled={!contactId || isLoading || isSaving}
              aria-label={CHAT_MESSAGES.composerAddNoteLabel}
              onClick={() => setIsAdding(true)}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
          {!contactId ? (
            <p className="text-sm text-muted-foreground">
              {CHAT_MESSAGES.contactNotesUnavailable}
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              {isAdding ? (
                <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={CHAT_MESSAGES.contactNotesPlaceholder}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() => {
                        setIsAdding(false);
                        setDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSaving || !draft.trim()}
                      onClick={() => {
                        void handleAdd();
                      }}
                    >
                      {isSaving ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                      {CHAT_MESSAGES.internalNotesSave}
                    </Button>
                  </div>
                </div>
              ) : null}

              {entries.length === 0 && !isAdding ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {CHAT_MESSAGES.contactNotesEmpty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {entries.map((entry, index) => (
                    <li
                      key={`${index}-${entry.slice(0, 24)}`}
                      className="flex items-start gap-2 rounded-lg border bg-background p-3"
                    >
                      <p className="min-w-0 flex-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
                        {entry}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        disabled={isSaving}
                        aria-label={CHAT_MESSAGES.contactNoteDelete}
                        onClick={() => {
                          void handleDelete(index);
                        }}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
