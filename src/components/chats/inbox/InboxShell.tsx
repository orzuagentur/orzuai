"use client";

import type { ReactNode } from "react";

import { useInboxLayout } from "@/components/chats/inbox/inbox-layout-context";
import { cn } from "@/lib/utils";

type InboxShellProps = {
  /** @deprecated Channel list moved into the header Filters hover card. */
  channelTabs?: ReactNode;
  listColumn: ReactNode;
  chatColumn: ReactNode;
  detailsColumn: ReactNode;
  showChatOnMobile?: boolean;
  showRightColumn?: boolean;
  className?: string;
};

function InboxShellContent({
  listColumn,
  chatColumn,
  detailsColumn,
  showChatOnMobile = false,
  showRightColumn,
  className,
}: InboxShellProps) {
  const { detailsOpen, mobileDetailsOpen, chatFullscreen } = useInboxLayout();
  const rightColumnOpen = showRightColumn ?? detailsOpen;
  const showMobileDetails = Boolean(showChatOnMobile && mobileDetailsOpen);

  return (
    <div
      className={cn(
        "flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {!chatFullscreen && !showMobileDetails ? (
          <div
            className={cn(
              "min-h-0 min-w-0 overflow-hidden border-r border-border/60",
              showChatOnMobile
                ? "hidden lg:flex lg:w-[22rem] lg:shrink-0"
                : "flex w-full min-w-0 flex-1 lg:w-[22rem] lg:flex-none lg:shrink-0",
            )}
          >
            <aside className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden">
              {listColumn}
            </aside>
          </div>
        ) : null}

        {!showMobileDetails ? (
          <main
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
              chatFullscreen || showChatOnMobile
                ? "flex w-full"
                : "hidden lg:flex",
            )}
          >
            {chatColumn}
          </main>
        ) : null}

        {showMobileDetails ? (
          <aside className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background xl:hidden">
            {detailsColumn}
          </aside>
        ) : null}

        {!chatFullscreen && !showMobileDetails && rightColumnOpen ? (
          <aside className="hidden min-h-0 w-[20rem] min-w-0 shrink-0 flex-col overflow-hidden border-l bg-background xl:flex">
            {detailsColumn}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function InboxShell(props: InboxShellProps) {
  return <InboxShellContent {...props} />;
}
