"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContactRecordPanel } from "@/components/contacts/ContactRecordPanel";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";

type ContactProfileDrawerProps = {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContactProfileDrawer({
  contactId,
  open,
  onOpenChange,
}: ContactProfileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{CONTACTS_MESSAGES.profileTitle}</SheetTitle>
        </SheetHeader>
        <ContactRecordPanel
          contactId={open ? contactId : null}
          onContactDeleted={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
