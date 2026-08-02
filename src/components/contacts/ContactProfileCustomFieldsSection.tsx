"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listContactFieldIconsAction } from "@/features/contacts/actions/list-contact-field-icons";
import { updateContactProfileFieldsAction } from "@/features/contacts/actions/update-contact-profile-fields";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { resolveContactFieldIcon } from "@/lib/contact-field-icons";
import { cn } from "@/lib/utils";
import type { ContactFieldIconOption } from "@/types/contact.types";
import {
  createContactProfileFieldId,
  type ContactProfileFieldEntry,
} from "@/utils/contact-profile-fields";

type ContactProfileCustomFieldsSectionProps = {
  contactId: string;
  profileFields: ContactProfileFieldEntry[];
  readOnly?: boolean;
  onFieldsChange?: (fields: ContactProfileFieldEntry[]) => void;
  className?: string;
};

export function ContactProfileCustomFieldsSection({
  contactId,
  profileFields,
  readOnly = false,
  onFieldsChange,
  className,
}: ContactProfileCustomFieldsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [icons, setIcons] = useState<ContactFieldIconOption[]>([]);
  const [iconsLoading, setIconsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [iconKey, setIconKey] = useState("tag");

  const canEdit = !readOnly;

  useEffect(() => {
    if (!dialogOpen || icons.length > 0) {
      return;
    }

    let cancelled = false;
    setIconsLoading(true);

    void listContactFieldIconsAction()
      .then((rows) => {
        if (cancelled) {
          return;
        }

        setIcons(rows);
        const firstKey = rows[0]?.key;
        if (firstKey) {
          setIconKey((current) => current || firstKey);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIconsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dialogOpen, icons.length]);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setValue("");
    setIconKey(icons[0]?.key ?? "tag");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(field: ContactProfileFieldEntry) {
    setEditingId(field.id);
    setLabel(field.label);
    setValue(field.value);
    setIconKey(field.iconKey);
    setDialogOpen(true);
  }

  async function persistFields(nextFields: ContactProfileFieldEntry[]) {
    setIsSaving(true);

    try {
      const result = await updateContactProfileFieldsAction({
        contactId,
        profileFields: nextFields,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      onFieldsChange?.(nextFields);
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();

    if (!trimmedLabel) {
      toast.error(CONTACTS_MESSAGES.customFieldNameRequired);
      return;
    }

    const nextEntry: ContactProfileFieldEntry = {
      id: editingId ?? createContactProfileFieldId(),
      label: trimmedLabel,
      iconKey,
      value: trimmedValue,
    };

    const nextFields = editingId
      ? profileFields.map((field) =>
          field.id === editingId ? nextEntry : field,
        )
      : [...profileFields, nextEntry];

    const saved = await persistFields(nextFields);

    if (!saved) {
      return;
    }

    toast.success(CONTACTS_MESSAGES.customFieldSaved);
    setDialogOpen(false);
    resetForm();
  }

  async function handleRemove(fieldId: string) {
    const nextFields = profileFields.filter((field) => field.id !== fieldId);
    const saved = await persistFields(nextFields);

    if (!saved) {
      return;
    }

    toast.success(CONTACTS_MESSAGES.customFieldRemoved);
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {profileFields.length > 0 ? (
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {profileFields.map((field) => {
                  const Icon = resolveContactFieldIcon(field.iconKey);

                  return (
                    <tr key={field.id} className="align-top">
                      <td className="w-36 shrink-0 px-3 py-2.5 text-muted-foreground">
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 text-left",
                            canEdit && "hover:text-foreground",
                          )}
                          disabled={!canEdit || isSaving}
                          onClick={() => {
                            if (canEdit) {
                              openEditDialog(field);
                            }
                          }}
                        >
                          <Icon className="size-3.5 shrink-0" />
                          <span className="text-xs font-medium">
                            {field.label}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium [overflow-wrap:anywhere] [word-break:break-word]">
                        <div className="flex items-start justify-between gap-2">
                          <span>{field.value || "—"}</span>
                          {canEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={isSaving}
                              aria-label={CONTACTS_MESSAGES.removeCustomField}
                              onClick={() => {
                                void handleRemove(field.id);
                              }}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full gap-1.5"
            disabled={isSaving || profileFields.length >= 30}
            onClick={openCreateDialog}
            aria-label={CONTACTS_MESSAGES.addCustomFieldAria}
          >
            {isSaving ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
            {CONTACTS_MESSAGES.addCustomField}
          </Button>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? CONTACTS_MESSAGES.customFieldEditTitle
                : CONTACTS_MESSAGES.customFieldDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {CONTACTS_MESSAGES.customFieldDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-field-name">
                {CONTACTS_MESSAGES.customFieldNameLabel}
              </Label>
              <Input
                id="custom-field-name"
                value={label}
                maxLength={80}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="e.g. Birthday, Source, Niche"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-field-value">
                {CONTACTS_MESSAGES.customFieldValueLabel}
              </Label>
              <Input
                id="custom-field-value"
                value={value}
                maxLength={500}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Value"
              />
            </div>

            <div className="space-y-2">
              <Label>{CONTACTS_MESSAGES.customFieldIconLabel}</Label>
              {iconsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Loading icons…
                </div>
              ) : (
                <div className="grid max-h-48 grid-cols-7 gap-1.5 overflow-y-auto rounded-md border p-2">
                  {icons.map((icon) => {
                    const Icon = resolveContactFieldIcon(icon.key);
                    const selected = iconKey === icon.key;

                    return (
                      <button
                        key={icon.key}
                        type="button"
                        title={icon.label}
                        aria-label={icon.label}
                        aria-pressed={selected}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md border transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        onClick={() => setIconKey(icon.key)}
                      >
                        <Icon className="size-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              {CONTACTS_MESSAGES.cancelEdit}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => {
                void handleSave();
              }}
            >
              {isSaving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                CONTACTS_MESSAGES.saveContact
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
