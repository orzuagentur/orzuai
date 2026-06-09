"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type InboxShellProps = {
  channelTabs?: ReactNode;
  listColumn: ReactNode;
  chatColumn: ReactNode;
  detailsColumn: ReactNode;
  showChatOnMobile?: boolean;
  className?: string;
};

export function InboxShell({
  channelTabs,
  listColumn,
  chatColumn,
  detailsColumn,
  showChatOnMobile = false,
  className,
}: InboxShellProps) {
  return (
    <div
      className={cn(
        "flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      {channelTabs}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-r lg:w-[22rem] lg:shrink-0 xl:w-80",
            showChatOnMobile && "hidden lg:flex",
          )}
        >
          {listColumn}
        </div>

        <div
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            showChatOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          {chatColumn}
        </div>

        <div className="hidden min-h-0 w-80 shrink-0 border-l xl:flex xl:flex-col">
          {detailsColumn}
        </div>
      </div>
    </div>
  );
}
