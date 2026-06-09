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
};

const InboxLayoutContext = createContext<InboxLayoutContextValue | null>(null);

export function InboxLayoutProvider({ children }: { children: ReactNode }) {
  const [detailsOpen, setDetailsOpenState] = useState(true);

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

  const value = useMemo(
    () => ({
      detailsOpen,
      setDetailsOpen,
      toggleDetails,
    }),
    [detailsOpen, setDetailsOpen, toggleDetails],
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
