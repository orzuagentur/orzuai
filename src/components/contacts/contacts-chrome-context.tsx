"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ContactSegment } from "@/types/contact.types";

export type ContactsChromeConfig = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeView: "list" | "pipeline";
  onViewChange: (view: "list" | "pipeline") => void;
  activeSegment: ContactSegment;
  onSegmentChange: (segment: ContactSegment) => void;
};

type ContactsChromeContextValue = {
  chrome: ContactsChromeConfig | null;
  setChrome: (chrome: ContactsChromeConfig | null) => void;
};

export const ContactsChromeContext =
  createContext<ContactsChromeContextValue | null>(null);

function chromePrimitivesEqual(
  a: ContactsChromeConfig,
  b: ContactsChromeConfig,
): boolean {
  return (
    a.searchQuery === b.searchQuery &&
    a.activeView === b.activeView &&
    a.activeSegment === b.activeSegment
  );
}

export function ContactsChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<ContactsChromeConfig | null>(null);

  const setChrome = useCallback((next: ContactsChromeConfig | null) => {
    setChromeState((prev) => {
      if (prev === null && next === null) {
        return prev;
      }

      if (prev === null || next === null) {
        return next;
      }

      if (!chromePrimitivesEqual(prev, next)) {
        return next;
      }

      if (
        prev.onSearchChange !== next.onSearchChange ||
        prev.onViewChange !== next.onViewChange ||
        prev.onSegmentChange !== next.onSegmentChange
      ) {
        return next;
      }

      return prev;
    });
  }, []);

  const value = useMemo(
    () => ({
      chrome,
      setChrome,
    }),
    [chrome, setChrome],
  );

  return (
    <ContactsChromeContext.Provider value={value}>
      {children}
    </ContactsChromeContext.Provider>
  );
}

export function useOptionalContactsChrome() {
  const context = useContext(ContactsChromeContext);
  return context?.chrome ?? null;
}

export function useContactsChromeRegistration(config: ContactsChromeConfig | null) {
  const context = useContext(ContactsChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  const enabled =
    config !== null &&
    typeof config.onSearchChange === "function" &&
    typeof config.onViewChange === "function" &&
    typeof config.onSegmentChange === "function";

  const searchQuery = config?.searchQuery ?? "";
  const activeView = config?.activeView ?? "list";
  const activeSegment = config?.activeSegment ?? "all";
  const onSearchChange = config?.onSearchChange;
  const onViewChange = config?.onViewChange;
  const onSegmentChange = config?.onSegmentChange;

  useEffect(() => {
    const setChrome = setChromeRef.current;

    if (!setChrome) {
      return;
    }

    if (
      !enabled ||
      !onSearchChange ||
      !onViewChange ||
      !onSegmentChange
    ) {
      setChrome(null);
      return;
    }

    setChrome({
      searchQuery,
      onSearchChange,
      activeView,
      onViewChange,
      activeSegment,
      onSegmentChange,
    });

    return () => {
      setChrome(null);
    };
  }, [
    enabled,
    searchQuery,
    activeView,
    activeSegment,
    onSearchChange,
    onViewChange,
    onSegmentChange,
  ]);
}
