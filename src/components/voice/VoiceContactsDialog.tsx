"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PhoneIcon, UserPlusIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VoiceAddContactDialog } from "@/components/voice/VoiceAddContactDialog";
import { listPhoneContactsAction } from "@/features/voice/actions/phone-contact";
import type { PhoneContactListItem } from "@/services/phone-contact.service";
import type { PhoneContactListScope } from "@/services/phone-contact.service";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { formatContactIdentifier } from "@/utils/contact-display";

type VoiceContactsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: PhoneContactListItem) => void;
  contactScope?: PhoneContactListScope;
  onContactsChange?: () => void;
};

export function VoiceContactsDialog({
  open,
  onOpenChange,
  onSelectContact,
  contactScope = "phonebook",
  onContactsChange,
}: VoiceContactsDialogProps) {
  const [contacts, setContacts] = useState<PhoneContactListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [prefillPhone, setPrefillPhone] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setIsLoading(true);

    void listPhoneContactsAction(contactScope)
      .then(setContacts)
      .finally(() => setIsLoading(false));
  }, [contactScope, open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>{VOICE_MESSAGES.contactsTitle}</DialogTitle>
            <DialogDescription>{VOICE_MESSAGES.contactsButton}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto px-2 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2Icon className="size-5 animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                {VOICE_MESSAGES.contactsEmpty}
              </p>
            ) : (
              <ul className="space-y-1">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectContact(contact);
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <ContactAvatar name={contact.name} className="size-10 shrink-0 text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{contact.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {formatContactIdentifier(contact.phoneNumber)}
                        </p>
                        {contact.company ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {contact.company}
                          </p>
                        ) : null}
                      </div>
                      <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setPrefillPhone("");
                setAddContactOpen(true);
              }}
            >
              <UserPlusIcon className="mr-2 size-4" />
              {VOICE_MESSAGES.addContactButton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VoiceAddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        phoneNumber={prefillPhone}
        onContactCreated={() => {
          void listPhoneContactsAction(contactScope).then(setContacts);
          onContactsChange?.();
        }}
      />
    </>
  );
}
