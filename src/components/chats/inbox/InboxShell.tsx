"use client";

import type { ReactNode } from "react";

import {
  InboxLayoutProvider,
  useInboxLayout,
} from "@/components/chats/inbox/inbox-layout-context";
import { cn } from "@/lib/utils";

type InboxShellProps = {
  channelTabs?: ReactNode;
  listColumn: ReactNode;
  chatColumn: ReactNode;
  detailsColumn: ReactNode;
  showChatOnMobile?: boolean;
  className?: string;
};

function InboxShellContent({
  channelTabs,
  listColumn,
  chatColumn,
  detailsColumn,
  showChatOnMobile = false,
  className,
}: InboxShellProps) {
  const { detailsOpen, chatFullscreen } = useInboxLayout();

  return (
    <div
      className={cn(
        "flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      {!chatFullscreen ? channelTabs : null}

      <div
        className={cn(
          "grid min-h-0 min-w-0 flex-1 overflow-hidden",
          chatFullscreen
            ? "grid-cols-1"
            : detailsOpen
              ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,20rem)]"
              : "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]",
        )}
      >
        {!chatFullscreen ? (
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden border-r",
              showChatOnMobile && "hidden lg:flex",
            )}
          >
            {listColumn}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            chatFullscreen || showChatOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          {chatColumn}
        </div>

        {!chatFullscreen && detailsOpen ? (
          <div className="hidden min-h-0 min-w-0 flex-col overflow-hidden border-l xl:flex">
            {detailsColumn}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InboxShell(props: InboxShellProps) {
  return (
    <InboxLayoutProvider>
      <InboxShellContent {...props} />
    </InboxLayoutProvider>
  );
}
