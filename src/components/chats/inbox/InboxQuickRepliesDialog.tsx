"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCannedResponseAction } from "@/features/canned-responses/actions/create-canned-response";
import { deleteCannedResponseAction } from "@/features/canned-responses/actions/delete-canned-response";
import { fetchCannedResponsesAction } from "@/features/canned-responses/actions/fetch-canned-responses";
import { updateCannedResponseAction } from "@/features/canned-responses/actions/update-canned-response";
import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import type { CannedResponseItem } from "@/types/canned-response.types";

type InboxQuickRepliesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResponses: CannedResponseItem[];
  onResponsesChange?: (responses: CannedResponseItem[]) => void;
  onSelect?: (content: string) => void;
};

export function InboxQuickRepliesDialog({
  open,
  onOpenChange,
  initialResponses,
  onResponsesChange,
  onSelect,
}: InboxQuickRepliesDialogProps) {
  const router = useRouter();
  const [responses, setResponses] = useState(initialResponses);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResponses(initialResponses);
    }
  }, [open, initialResponses]);

  function resetDraft() {
    setTitle("");
    setContent("");
    setEditingId(null);
  }

  function startEdit(item: CannedResponseItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
  }

  async function refreshList() {
    const result = await fetchCannedResponsesAction();
    if (result.success) {
      setResponses(result.data.cannedResponses);
      onResponsesChange?.(result.data.cannedResponses);
    }
    router.refresh();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = editingId
        ? await updateCannedResponseAction({
            id: editingId,
            title,
            content,
            channel: null,
          })
        : await createCannedResponseAction({
            title,
            content,
            channel: null,
          });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CANNED_RESPONSES_MESSAGES.saved);
      resetDraft();
      await refreshList();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteCannedResponseAction({ id });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(CANNED_RESPONSES_MESSAGES.deleted);
      if (editingId === id) {
        resetDraft();
      }
      await refreshList();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{CANNED_RESPONSES_MESSAGES.manageInChatTitle}</DialogTitle>
          <DialogDescription>
            {CANNED_RESPONSES_MESSAGES.manageInChatDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border p-3">
            <div className="space-y-2">
              <Label htmlFor="inbox-qr-title">
                {CANNED_RESPONSES_MESSAGES.titleLabel}
              </Label>
              <Input
                id="inbox-qr-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Greeting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inbox-qr-content">
                {CANNED_RESPONSES_MESSAGES.contentLabel}
              </Label>
              <Textarea
                id="inbox-qr-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={3}
                placeholder="Hi! How can I help you today?"
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingId ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={isSaving || !title.trim() || !content.trim()}
                onClick={() => {
                  void handleSave();
                }}
              >
                {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {editingId
                  ? CANNED_RESPONSES_MESSAGES.saveButton
                  : CANNED_RESPONSES_MESSAGES.addButton}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {CANNED_RESPONSES_MESSAGES.pickerEmpty}
              </p>
            ) : (
              responses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      onSelect?.(item.content);
                      onOpenChange(false);
                    }}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.content}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={deletingId === item.id}
                      onClick={() => {
                        void handleDelete(item.id);
                      }}
                    >
                      {deletingId === item.id ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
