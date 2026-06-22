"use client";

import type { ReactNode } from "react";

import { useInboxLayout } from "@/components/chats/inbox/inbox-layout-context";
import { ChannelRailAside } from "@/components/navigation/ChannelRailAside";
import { cn } from "@/lib/utils";

type InboxShellProps = {
  channelTabs?: ReactNode;
  listColumn: ReactNode;
  chatColumn: ReactNode;
  detailsColumn: ReactNode;
  showChatOnMobile?: boolean;
  showRightColumn?: boolean;
  className?: string;
};

function InboxShellContent({
  channelTabs,
  listColumn,
  chatColumn,
  detailsColumn,
  showChatOnMobile = false,
  showRightColumn,
  className,
}: InboxShellProps) {
  const { detailsOpen, chatFullscreen } = useInboxLayout();
  const rightColumnOpen = showRightColumn ?? detailsOpen;

  return (
    <div
      className={cn(
        "flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {!chatFullscreen ? (
          <div
            className={cn(
              "flex min-h-0 min-w-0 shrink-0 overflow-hidden border-r",
              showChatOnMobile && "hidden lg:flex",
            )}
          >
            {channelTabs ? (
              <ChannelRailAside>{channelTabs}</ChannelRailAside>
            ) : null}

            <aside className="flex w-full min-h-0 min-w-0 flex-col overflow-hidden lg:w-[22rem]">
              {listColumn}
            </aside>
          </div>
        ) : null}

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
            chatFullscreen || showChatOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          {chatColumn}
        </main>

        {!chatFullscreen && rightColumnOpen ? (
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
