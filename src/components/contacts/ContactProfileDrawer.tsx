"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { ContactFullProfilePanel } from "@/components/contacts/ContactFullProfilePanel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getContactProfileAction } from "@/features/contacts/actions/get-contact-profile";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { ContactProfileData } from "@/types/contact.types";

type ContactProfileDrawerProps = {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactDeleted?: () => void;
};

export function ContactProfileDrawer({
  contactId,
  open,
  onOpenChange,
  onContactDeleted,
}: ContactProfileDrawerProps) {
  const [profile, setProfile] = useState<ContactProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async (id: string) => {
    setIsLoading(true);
    const data = await getContactProfileAction(id);
    setProfile(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!open || !contactId) {
      return;
    }

    void loadProfile(contactId);
  }, [contactId, loadProfile, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{CONTACTS_MESSAGES.profileTitle}</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <ContactFullProfilePanel
            profile={profile}
            onRefresh={() => loadProfile(contactId!)}
            onContactDeleted={() => {
              onContactDeleted?.();
              onOpenChange(false);
            }}
            onClose={() => onOpenChange(false)}
            showCloseButton
            className="border-0"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
            Contact not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
