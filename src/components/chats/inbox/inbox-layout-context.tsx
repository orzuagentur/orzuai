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

const INBOX_DETAILS_OPEN_STORAGE_KEY = "inbox-details-panel-open";

type InboxLayoutContextValue = {
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
  toggleDetails: () => void;
  /** Mobile-only: full-screen contact/details pane (defaults closed). */
  mobileDetailsOpen: boolean;
  setMobileDetailsOpen: (open: boolean) => void;
  toggleMobileDetails: () => void;
  chatFullscreen: boolean;
  setChatFullscreen: (open: boolean) => void;
  toggleChatFullscreen: () => void;
};

const InboxLayoutContext = createContext<InboxLayoutContextValue | null>(null);

export function InboxLayoutProvider({ children }: { children: ReactNode }) {
  const [detailsOpen, setDetailsOpenState] = useState(true);
  const [mobileDetailsOpen, setMobileDetailsOpenState] = useState(false);
  const [chatFullscreen, setChatFullscreenState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(INBOX_DETAILS_OPEN_STORAGE_KEY);

    if (stored === "false") {
      setDetailsOpenState(false);
    }
  }, []);

  const setDetailsOpen = useCallback((open: boolean) => {
    setDetailsOpenState(open);
    window.localStorage.setItem(INBOX_DETAILS_OPEN_STORAGE_KEY, String(open));
  }, []);

  const toggleDetails = useCallback(() => {
    setDetailsOpenState((current) => {
      const next = !current;
      window.localStorage.setItem(INBOX_DETAILS_OPEN_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const setMobileDetailsOpen = useCallback((open: boolean) => {
    setMobileDetailsOpenState(open);
  }, []);

  const toggleMobileDetails = useCallback(() => {
    setMobileDetailsOpenState((current) => !current);
  }, []);

  const setChatFullscreen = useCallback((open: boolean) => {
    setChatFullscreenState(open);
  }, []);

  const toggleChatFullscreen = useCallback(() => {
    setChatFullscreenState((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      detailsOpen,
      setDetailsOpen,
      toggleDetails,
      mobileDetailsOpen,
      setMobileDetailsOpen,
      toggleMobileDetails,
      chatFullscreen,
      setChatFullscreen,
      toggleChatFullscreen,
    }),
    [
      chatFullscreen,
      detailsOpen,
      mobileDetailsOpen,
      setChatFullscreen,
      setDetailsOpen,
      setMobileDetailsOpen,
      toggleChatFullscreen,
      toggleDetails,
      toggleMobileDetails,
    ],
  );

  return (
    <InboxLayoutContext.Provider value={value}>{children}</InboxLayoutContext.Provider>
  );
}

export function useInboxLayout() {
  const context = useContext(InboxLayoutContext);

  if (!context) {
    throw new Error("useInboxLayout must be used within InboxLayoutProvider");
  }

  return context;
}

export function useOptionalInboxLayout() {
  return useContext(InboxLayoutContext);
}
