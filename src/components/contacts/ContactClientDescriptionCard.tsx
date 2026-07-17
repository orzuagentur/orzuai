"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PencilIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateContactClientDescriptionAction } from "@/features/contacts/actions/update-contact-client-description";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";

type ContactClientDescriptionCardProps = {
  contactId: string;
  aiSummary: string | null;
  onRefresh: () => Promise<void>;
  className?: string;
};

export function ContactClientDescriptionCard({
  contactId,
  aiSummary,
  onRefresh,
  className,
}: ContactClientDescriptionCardProps) {
  const [value, setValue] = useState(aiSummary?.trim() ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setValue(aiSummary?.trim() ?? "");
    }
  }, [aiSummary, isEditing]);

  const trimmed = value.trim();
  const saved = aiSummary?.trim() ?? "";
  const isDirty = trimmed !== saved;

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateContactClientDescriptionAction({
        contactId,
        description: value,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.clientDescriptionSaved);
      setIsEditing(false);
      await onRefresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">
            {CONTACTS_MESSAGES.clientDescriptionTitle}
          </h3>
          <p className="text-xs text-muted-foreground">
            {CONTACTS_MESSAGES.clientDescriptionHint}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                disabled={isSaving}
                onClick={() => {
                  setValue(saved);
                  setIsEditing(false);
                }}
              >
                {CONTACTS_MESSAGES.cancelEdit}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                disabled={isSaving || !isDirty}
                onClick={() => {
                  void handleSave();
                }}
              >
                {isSaving ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="size-3.5" />
                )}
                {CONTACTS_MESSAGES.saveContact}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label={CONTACTS_MESSAGES.editClientDescription}
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={CONTACTS_MESSAGES.clientDescriptionPlaceholder}
          rows={4}
          className="min-h-[96px] resize-y"
          disabled={isSaving}
          autoFocus
        />
      ) : (
        <div className="rounded-lg border bg-card px-4 py-3">
          {saved ? (
            <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">
              {saved}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {CONTACTS_MESSAGES.clientDescriptionEmpty}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
