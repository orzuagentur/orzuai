"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createPhoneContactAction } from "@/features/voice/actions/phone-contact";
import { VOICE_MESSAGES } from "@/features/voice/constants";

type VoiceAddContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  defaultName?: string;
  onContactCreated?: (input: {
    contactId: string;
    conversationId: string;
    phoneNumber: string;
    name: string;
  }) => void;
};

export function VoiceAddContactDialog({
  open,
  onOpenChange,
  phoneNumber,
  defaultName = "",
  onContactCreated,
}: VoiceAddContactDialogProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(phoneNumber);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setPhone(phoneNumber);
      setEmail("");
      setCompany("");
      setNotes("");
    }
  }, [defaultName, open, phoneNumber]);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await createPhoneContactAction({
        phoneNumber: phone,
        name,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.addContactFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.addContactSuccess);
      onContactCreated?.({
        contactId: result.contactId,
        conversationId: result.conversationId,
        phoneNumber: phone.trim(),
        name: name.trim() || phone.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{VOICE_MESSAGES.addContactTitle}</DialogTitle>
          <DialogDescription>{VOICE_MESSAGES.addContactDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="voice-add-contact-name">{VOICE_MESSAGES.addContactNameLabel}</Label>
            <Input
              id="voice-add-contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={VOICE_MESSAGES.addContactNamePlaceholder}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-add-contact-phone">{VOICE_MESSAGES.addContactPhoneLabel}</Label>
            <Input
              id="voice-add-contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-add-contact-email">{VOICE_MESSAGES.addContactEmailLabel}</Label>
            <Input
              id="voice-add-contact-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={VOICE_MESSAGES.addContactEmailPlaceholder}
              type="email"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-add-contact-company">
              {VOICE_MESSAGES.addContactCompanyLabel}
            </Label>
            <Input
              id="voice-add-contact-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={VOICE_MESSAGES.addContactCompanyPlaceholder}
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-add-contact-notes">{VOICE_MESSAGES.addContactNotesLabel}</Label>
            <Textarea
              id="voice-add-contact-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={VOICE_MESSAGES.addContactNotesPlaceholder}
              rows={3}
              className="min-h-0 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" disabled={isSaving || !phone.trim()} onClick={() => void handleSave()}>
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                {VOICE_MESSAGES.addContactSaving}
              </>
            ) : (
              VOICE_MESSAGES.addContactSave
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
