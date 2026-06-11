"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { ContactFullProfilePanel } from "@/components/contacts/ContactFullProfilePanel";
import { ContactWorkPanel } from "@/components/contacts/ContactWorkPanel";
import { getContactProfileAction } from "@/features/contacts/actions/get-contact-profile";
import type { ContactProfileData } from "@/types/contact.types";
import { cn } from "@/lib/utils";

type ContactRecordWorkspaceProps = {
  contactId: string | null;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onContactDeleted?: () => void;
  onBack?: () => void;
  className?: string;
};

export function ContactRecordWorkspace({
  contactId,
  profileOpen,
  onToggleProfile,
  onContactDeleted,
  onBack,
  className,
}: ContactRecordWorkspaceProps) {
  const [profile, setProfile] = useState<ContactProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(
    async (id: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }

      const data = await getContactProfileAction(id);
      setProfile(data);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (!contactId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    void loadProfile(contactId);
  }, [contactId, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!contactId) {
      return;
    }

    await loadProfile(contactId, { silent: true });
  }, [contactId, loadProfile]);

  if (!contactId) {
    return (
      <ContactWorkPanel
        profile={null}
        isLoading={false}
        onRefresh={async () => {}}
        profileOpen={false}
        onToggleProfile={onToggleProfile}
        onBack={onBack}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 overflow-hidden",
        profileOpen &&
          "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]",
        className,
      )}
    >
      <ContactWorkPanel
        profile={profile}
        isLoading={isLoading}
        onRefresh={refreshProfile}
        profileOpen={profileOpen}
        onToggleProfile={onToggleProfile}
        onBack={onBack}
        className="min-w-0"
      />

      {profileOpen && profile && !isLoading ? (
        <div className="hidden min-h-0 min-w-0 xl:flex">
          <ContactFullProfilePanel
            profile={profile}
            onRefresh={refreshProfile}
            onContactDeleted={onContactDeleted}
            className="w-full"
          />
        </div>
      ) : null}

      {isLoading && profileOpen ? (
        <div className="hidden items-center justify-center border-l xl:flex xl:w-[20rem]">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
