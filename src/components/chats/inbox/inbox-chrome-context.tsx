"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ChatInboxFilter } from "@/features/chats/constants";
import type { MessagingChannel } from "@/types/database.types";

export type InboxChromeConfig = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ChatInboxFilter;
  onFilterChange: (filter: ChatInboxFilter) => void;
  aiChannel: MessagingChannel | null;
  aiEnabled: boolean | null;
  onAiToggle?: () => void;
};

type InboxChromeContextValue = {
  chrome: InboxChromeConfig | null;
  setChrome: (chrome: InboxChromeConfig | null) => void;
};

export const InboxChromeContext = createContext<InboxChromeContextValue | null>(null);

export function InboxChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<InboxChromeConfig | null>(null);

  const setChrome = useCallback((next: InboxChromeConfig | null) => {
    setChromeState(next);
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
    }),
    [chrome, setChrome],
  );

  return (
    <InboxChromeContext.Provider value={value}>{children}</InboxChromeContext.Provider>
  );
}

function useOptionalInboxChromeContext() {
  return useContext(InboxChromeContext);
}

export function useInboxChromeContext() {
  const context = useOptionalInboxChromeContext();

  if (!context) {
    throw new Error("useInboxChromeContext must be used within InboxChromeProvider");
  }

  return context;
}

export function useInboxChromeRegistration(config: InboxChromeConfig | null) {
  const context = useOptionalInboxChromeContext();
  const searchQuery = config?.searchQuery ?? "";
  const onSearchChange = config?.onSearchChange;
  const activeFilter = config?.activeFilter ?? "all";
  const onFilterChange = config?.onFilterChange;
  const aiChannel = config?.aiChannel ?? null;
  const aiEnabled = config?.aiEnabled ?? null;
  const onAiToggle = config?.onAiToggle;

  useEffect(() => {
    if (!context) {
      return;
    }

    if (!config || !onSearchChange || !onFilterChange) {
      context.setChrome(null);
      return;
    }

    context.setChrome({
      searchQuery,
      onSearchChange,
      activeFilter,
      onFilterChange,
      aiChannel,
      aiEnabled,
      onAiToggle,
    });

    return () => {
      context.setChrome(null);
    };
  }, [
    context,
    config,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    aiChannel,
    aiEnabled,
    onAiToggle,
  ]);
}
