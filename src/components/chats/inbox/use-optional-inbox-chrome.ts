"use client";

import { useContext } from "react";

import type { InboxChromeConfig } from "@/components/chats/inbox/inbox-chrome-context";
import { InboxChromeContext } from "@/components/chats/inbox/inbox-chrome-context";

export function useOptionalInboxChrome(): InboxChromeConfig | null {
  const context = useContext(InboxChromeContext);
  return context?.chrome ?? null;
}
