"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCannedResponseAction } from "@/features/canned-responses/actions/create-canned-response";
import { deleteCannedResponseAction } from "@/features/canned-responses/actions/delete-canned-response";
import { updateCannedResponseAction } from "@/features/canned-responses/actions/update-canned-response";
import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

type CannedResponsesPanelProps = {
  initialResponses: CannedResponseItem[];
};

type DraftState = {
  id?: string;
  title: string;
  content: string;
  channel: MessagingIntegrationChannelId | "";
};

const EMPTY_DRAFT: DraftState = {
  title: "",
  content: "",
  channel: "",
};

export function CannedResponsesPanel({
  initialResponses,
}: CannedResponsesPanelProps) {
  const router = useRouter();
  const [responses, setResponses] = useState(initialResponses);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setResponses(initialResponses);
  }, [initialResponses]);

  function startCreate() {
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(item: CannedResponseItem) {
    setDraft({
      id: item.id,
      title: item.title,
      content: item.content,
      channel: item.channel ?? "",
    });
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const channel = draft.channel || null;
      const result = draft.id
        ? await updateCannedResponseAction({
            id: draft.id,
            title: draft.title,
            content: draft.content,
            channel,
          })
        : await createCannedResponseAction({
            title: draft.title,
            content: draft.content,
            channel,
          });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CANNED_RESPONSES_MESSAGES.saved);
      setDraft(EMPTY_DRAFT);
      router.refresh();
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
      setResponses((items) => items.filter((item) => item.id !== id));

      if (draft.id === id) {
        setDraft(EMPTY_DRAFT);
      }

      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{CANNED_RESPONSES_MESSAGES.sectionTitle}</CardTitle>
        <CardDescription>
          {CANNED_RESPONSES_MESSAGES.sectionDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {responses.length === 0 && !draft.title && !draft.content ? (
          <EmptyState
            variant="generic"
            title={CANNED_RESPONSES_MESSAGES.emptyTitle}
            description={CANNED_RESPONSES_MESSAGES.emptyDescription}
            actionLabel={CANNED_RESPONSES_MESSAGES.addButton}
            onAction={startCreate}
          />
        ) : (
          <ul className="space-y-3">
            {responses.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => startEdit(item)}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-body line-clamp-2 text-muted-foreground">
                    {item.content}
                  </p>
                  {item.channel ? (
                    <p className="text-caption mt-1 capitalize">
                      {item.channel.replace("_", " ")}
                    </p>
                  ) : null}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  disabled={deletingId === item.id}
                  onClick={() => {
                    void handleDelete(item.id);
                  }}
                  aria-label={CANNED_RESPONSES_MESSAGES.deleteButton}
                >
                  {deletingId === item.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {draft.id ? "Edit quick reply" : CANNED_RESPONSES_MESSAGES.addButton}
            </p>
            {draft.id ? (
              <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
                <PlusIcon className="size-4" />
                New
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="canned-title">
              {CANNED_RESPONSES_MESSAGES.titleLabel}
            </Label>
            <Input
              id="canned-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((value) => ({ ...value, title: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="canned-content">
              {CANNED_RESPONSES_MESSAGES.contentLabel}
            </Label>
            <Textarea
              id="canned-content"
              value={draft.content}
              onChange={(event) =>
                setDraft((value) => ({ ...value, content: event.target.value }))
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="canned-channel">
              {CANNED_RESPONSES_MESSAGES.channelLabel}
            </Label>
            <select
              id="canned-channel"
              value={draft.channel}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  channel: event.target.value as DraftState["channel"],
                }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{CANNED_RESPONSES_MESSAGES.channelAll}</option>
              {MESSAGING_INTEGRATION_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            disabled={isSaving || !draft.title.trim() || !draft.content.trim()}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              CANNED_RESPONSES_MESSAGES.saveButton
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
