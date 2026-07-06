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

import type { TenantSupportMessage } from "@/features/platform-support/actions";

const SUPPORT_OPEN_STORAGE_KEY = "orzu-support-open";

type PlatformSupportContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  messages: TenantSupportMessage[];
  setMessages: React.Dispatch<React.SetStateAction<TenantSupportMessage[]>>;
  threadId: string | null;
  setThreadId: (threadId: string | null) => void;
  threadLoaded: boolean;
  setThreadLoaded: (loaded: boolean) => void;
};

const PlatformSupportContext = createContext<PlatformSupportContextValue | null>(
  null,
);

function readStoredOpenState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SUPPORT_OPEN_STORAGE_KEY) === "1";
}

export function PlatformSupportProvider({
  children,
  initialUnreadCount = 0,
}: {
  children: ReactNode;
  initialUnreadCount?: number;
}) {
  const [isOpen, setIsOpenState] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [messages, setMessages] = useState<TenantSupportMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadLoaded, setThreadLoaded] = useState(false);

  useEffect(() => {
    setIsOpenState(readStoredOpenState());
  }, []);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPORT_OPEN_STORAGE_KEY, open ? "1" : "0");
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpenState((current) => {
      const next = !current;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SUPPORT_OPEN_STORAGE_KEY, next ? "1" : "0");
      }

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle,
      unreadCount,
      setUnreadCount,
      messages,
      setMessages,
      threadId,
      setThreadId,
      threadLoaded,
      setThreadLoaded,
    }),
    [
      isOpen,
      setIsOpen,
      toggle,
      unreadCount,
      messages,
      threadId,
      threadLoaded,
    ],
  );

  return (
    <PlatformSupportContext.Provider value={value}>
      {children}
    </PlatformSupportContext.Provider>
  );
}

export function usePlatformSupport() {
  const context = useContext(PlatformSupportContext);

  if (!context) {
    throw new Error(
      "usePlatformSupport must be used within PlatformSupportProvider",
    );
  }

  return context;
}
