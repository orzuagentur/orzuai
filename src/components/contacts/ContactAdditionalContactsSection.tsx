"use client";

import { useState } from "react";
import { MailIcon, PhoneIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  createAdditionalContactId,
  type AdditionalContactEntry,
  type AdditionalContactType,
} from "@/utils/contact-additional-contacts";

const NATIVE_SELECT_CLASSNAME =
  "border-input bg-background text-foreground ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden";

type ContactAdditionalContactsSectionProps = {
  additionalContacts: AdditionalContactEntry[];
  readOnly?: boolean;
  onContactsChange?: (contacts: AdditionalContactEntry[]) => void;
  compact?: boolean;
};

export function ContactAdditionalContactsSection({
  additionalContacts,
  readOnly = false,
  onContactsChange,
  compact = false,
}: ContactAdditionalContactsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<AdditionalContactType>("phone");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  const canEdit = !readOnly && Boolean(onContactsChange);

  function resetForm() {
    setType("phone");
    setValue("");
    setLabel("");
  }

  function handleAdd() {
    const trimmedValue = value.trim();

    if (!trimmedValue || !onContactsChange) {
      return;
    }

    const nextEntry: AdditionalContactEntry = {
      id: createAdditionalContactId(),
      type,
      value: trimmedValue,
      label: label.trim(),
    };

    onContactsChange([...additionalContacts, nextEntry]);
    setDialogOpen(false);
    resetForm();
  }

  function handleRemove(entryId: string) {
    if (!onContactsChange) {
      return;
    }

    onContactsChange(
      additionalContacts.filter((entry) => entry.id !== entryId),
    );
  }

  if (readOnly && additionalContacts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {CONTACTS_MESSAGES.additionalContactsTitle}
          </h3>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2"
              onClick={() => setDialogOpen(true)}
            >
              <PlusIcon className="size-3.5" />
              {!compact ? CONTACTS_MESSAGES.addAdditionalContact : null}
            </Button>
          ) : null}
        </div>

        {additionalContacts.length > 0 ? (
          <ul className="space-y-1.5">
            {additionalContacts.map((entry) => {
              const Icon = entry.type === "phone" ? PhoneIcon : MailIcon;
              const typeLabel =
                entry.type === "phone"
                  ? CONTACTS_MESSAGES.additionalContactPhoneType
                  : CONTACTS_MESSAGES.additionalContactEmailType;
              const displayLabel = entry.label
                ? `${typeLabel} · ${entry.label}`
                : typeLabel;

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {displayLabel}
                    </p>
                    <p className="truncate font-medium">{entry.value}</p>
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(entry.id)}
                      aria-label={CONTACTS_MESSAGES.deleteContact}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : canEdit ? (
          <p className="text-xs text-muted-foreground">
            {CONTACTS_MESSAGES.addAdditionalContact}
          </p>
        ) : null}
      </div>

      {canEdit ? (
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);

            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{CONTACTS_MESSAGES.addAdditionalContact}</DialogTitle>
              <DialogDescription>
                {CONTACTS_MESSAGES.additionalContactsTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="additional-contact-type">
                  {CONTACTS_MESSAGES.additionalContactTypeLabel}
                </Label>
                <select
                  id="additional-contact-type"
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as AdditionalContactType)
                  }
                  className={NATIVE_SELECT_CLASSNAME}
                >
                  <option value="phone">
                    {CONTACTS_MESSAGES.additionalContactPhoneType}
                  </option>
                  <option value="email">
                    {CONTACTS_MESSAGES.additionalContactEmailType}
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional-contact-value">
                  {CONTACTS_MESSAGES.additionalContactValueLabel}
                </Label>
                <Input
                  id="additional-contact-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={
                    type === "phone" ? "+998 90 123 45 67" : "name@company.com"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional-contact-label">
                  {CONTACTS_MESSAGES.additionalContactLabelField}
                </Label>
                <Input
                  id="additional-contact-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Work, Assistant, Billing…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {CONTACTS_MESSAGES.cancelEdit}
              </Button>
              <Button
                type="button"
                disabled={!value.trim()}
                onClick={handleAdd}
              >
                {CONTACTS_MESSAGES.addAdditionalContact}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
