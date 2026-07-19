"use client";

import { useRef, useState } from "react";
import { MailIcon, PenSquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { AddContactDialog } from "@/components/chats/inbox/AddContactDialog";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type ComposeWriteButtonProps = {
  className?: string;
};

/**
 * Top-right compose control: write icon → hover card with Email → opens email compose dialog.
 * Replaces the old "Add contact" button in the chats toolbar.
 */
export function ComposeWriteButton({ className }: ComposeWriteButtonProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  function openMenu() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  }

  function scheduleCloseMenu() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 140);
  }

  function handleOpenEmailCompose() {
    setMenuOpen(false);
    setDialogOpen(true);
  }

  function handleConversationReady(input: { conversationId: string }) {
    setDialogOpen(false);
    router.push(
      `${DASHBOARD_ROUTES.chats}?conversation=${input.conversationId}`,
    );
    router.refresh();
  }

  return (
    <>
      <div
        className={cn("relative shrink-0", className)}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleCloseMenu}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          aria-label={CHAT_MESSAGES.composeWrite}
          aria-expanded={menuOpen}
          onClick={openMenu}
        >
          <PenSquareIcon className="size-3.5" />
        </Button>

        {menuOpen ? (
          <div
            className="absolute top-full right-0 z-50 mt-1.5 w-52 rounded-xl border bg-popover p-2 text-popover-foreground shadow-md"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
          >
            <p className="mb-1.5 px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {CHAT_MESSAGES.composeWriteMenuTitle}
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
              onClick={handleOpenEmailCompose}
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-[#e8f0fe] text-[#1a73e8]">
                <ChannelBrandIcon channel="email" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{CHAT_MESSAGES.composeWriteEmail}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {CHAT_MESSAGES.composeWriteEmailHint}
                </span>
              </span>
              <MailIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        ) : null}
      </div>

      <AddContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConversationReady={handleConversationReady}
      />
    </>
  );
}
