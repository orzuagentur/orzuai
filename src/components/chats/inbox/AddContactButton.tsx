"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { AddContactDialog } from "@/components/chats/inbox/AddContactDialog";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { listConnectedAddContactChannelsAction } from "@/features/chats/actions/add-outbound-contact";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type AddContactButtonProps = {
  className?: string;
};

export function AddContactButton({ className }: AddContactButtonProps) {
  const router = useRouter();
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);

    try {
      const result = await listConnectedAddContactChannelsAction();
      setEmailAvailable(result.channels.includes("email"));
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const handleConversationReady = (input: { conversationId: string }) => {
    setDialogOpen(false);
    router.push(
      `${DASHBOARD_ROUTES.chats}/email?conversation=${input.conversationId}`,
    );
    router.refresh();
  };

  if (!loadingChannels && !emailAvailable) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-8 gap-1 px-2", className)}
        aria-label={CHAT_MESSAGES.addContact}
        disabled={loadingChannels}
        onClick={() => setDialogOpen(true)}
      >
        {loadingChannels ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <UserPlusIcon className="size-3.5" />
        )}
        <span className="hidden lg:inline">{CHAT_MESSAGES.addContact}</span>
      </Button>

      <AddContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConversationReady={handleConversationReady}
      />
    </>
  );
}
