"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
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
import { deleteVoicePhoneHistoryAction } from "@/features/voice/actions/delete-voice-phone-history";
import {
  deletePhoneContactAction,
  updatePhoneContactAction,
} from "@/features/voice/actions/phone-contact";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import { formatContactIdentifier } from "@/utils/contact-display";

type VoiceEditContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: PhoneContactListItem | null;
  phoneNumber?: string;
  onContactUpdated?: (input: {
    contactId: string;
    phoneNumber: string;
    name: string;
  }) => void;
  onContactDeleted?: (contactId: string) => void;
  onPhoneHistoryDeleted?: (phoneNumber: string) => void;
};

export function VoiceEditContactDialog({
  open,
  onOpenChange,
  contact,
  phoneNumber = "",
  onContactUpdated,
  onContactDeleted,
  onPhoneHistoryDeleted,
}: VoiceEditContactDialogProps) {
  const isContactMode = Boolean(contact);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (contact) {
      setName(contact.name);
      setPhone(contact.phoneNumber);
      setEmail(contact.email ?? "");
      setCompany(contact.company ?? "");
    } else {
      setName("");
      setPhone(phoneNumber);
      setEmail("");
      setCompany("");
    }

    setConfirmDelete(false);
  }, [contact, open, phoneNumber]);

  async function handleSave() {
    if (!contact) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updatePhoneContactAction({
        contactId: contact.id,
        phoneNumber: phone,
        name,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.editContactFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.editContactSuccess);
      onContactUpdated?.({
        contactId: contact.id,
        phoneNumber: phone.trim(),
        name: name.trim() || phone.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);

    try {
      if (contact) {
        const result = await deletePhoneContactAction({ contactId: contact.id });

        if (!result.success) {
          toast.error(result.message ?? VOICE_MESSAGES.deleteContactFailed);
          return;
        }

        toast.success(VOICE_MESSAGES.deleteContactSuccess);
        onContactDeleted?.(contact.id);
        onOpenChange(false);
        return;
      }

      const targetPhone = phone.trim() || phoneNumber.trim();

      if (!targetPhone) {
        toast.error(VOICE_MESSAGES.deletePhoneHistoryFailed);
        return;
      }

      const result = await deleteVoicePhoneHistoryAction({
        phoneNumber: targetPhone,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.deletePhoneHistoryFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.deletePhoneHistorySuccess);
      onPhoneHistoryDeleted?.(targetPhone);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  const deletePrompt = isContactMode
    ? VOICE_MESSAGES.deleteContactPrompt
    : VOICE_MESSAGES.deletePhoneHistoryPrompt;

  const deleteLabel = isContactMode
    ? VOICE_MESSAGES.deleteContactButton
    : VOICE_MESSAGES.deletePhoneHistoryButton;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setConfirmDelete(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isContactMode
              ? VOICE_MESSAGES.editContactTitle
              : VOICE_MESSAGES.deletePhoneHistoryTitle}
          </DialogTitle>
          <DialogDescription>
            {isContactMode
              ? VOICE_MESSAGES.editContactDescription
              : VOICE_MESSAGES.deletePhoneHistoryDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {isContactMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="voice-edit-contact-name">
                  {VOICE_MESSAGES.addContactNameLabel}
                </Label>
                <Input
                  id="voice-edit-contact-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={VOICE_MESSAGES.addContactNamePlaceholder}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-edit-contact-phone">
                  {VOICE_MESSAGES.addContactPhoneLabel}
                </Label>
                <Input
                  id="voice-edit-contact-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-edit-contact-email">
                  {VOICE_MESSAGES.addContactEmailLabel}
                </Label>
                <Input
                  id="voice-edit-contact-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={VOICE_MESSAGES.addContactEmailPlaceholder}
                  type="email"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-edit-contact-company">
                  {VOICE_MESSAGES.addContactCompanyLabel}
                </Label>
                <Input
                  id="voice-edit-contact-company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder={VOICE_MESSAGES.addContactCompanyPlaceholder}
                  autoComplete="organization"
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-medium">
              {formatContactIdentifier(phone.trim() || phoneNumber)}
            </p>
          )}

          {confirmDelete ? (
            <p className="text-sm text-muted-foreground">{deletePrompt}</p>
          ) : null}
        </div>

        <DialogFooter
          className={cn(
            "flex-col gap-2 sm:flex-row",
            isContactMode ? "sm:justify-between" : "sm:justify-end",
          )}
        >
          <Button
            type="button"
            variant="destructive"
            disabled={isSaving || isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                {VOICE_MESSAGES.deleteContactDeleting}
              </>
            ) : confirmDelete ? (
              VOICE_MESSAGES.deleteContactConfirm
            ) : (
              <>
                <Trash2Icon className="mr-2 size-4" />
                {deleteLabel}
              </>
            )}
          </Button>

          {isContactMode ? (
            <Button
              type="button"
              disabled={isSaving || isDeleting || !phone.trim() || !name.trim()}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  {VOICE_MESSAGES.editContactSaving}
                </>
              ) : (
                VOICE_MESSAGES.editContactSave
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
