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

export type CalendarDayChrome = {
  variant: "day";
  pageTitle: string;
  dateLabel: string;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  googleConnected: boolean;
  calendarLabel?: string | null;
  accountEmail?: string | null;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
};

export type CalendarBookingChrome = {
  variant: "booking";
  title: string;
  weekLabel: string;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export type CalendarChromeConfig = CalendarDayChrome | CalendarBookingChrome;

type CalendarChromeContextValue = {
  chrome: CalendarChromeConfig | null;
  setChrome: (chrome: CalendarChromeConfig | null) => void;
};

export const CalendarChromeContext =
  createContext<CalendarChromeContextValue | null>(null);

export function CalendarChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<CalendarChromeConfig | null>(null);

  const setChrome = useCallback((next: CalendarChromeConfig | null) => {
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
    <CalendarChromeContext.Provider value={value}>
      {children}
    </CalendarChromeContext.Provider>
  );
}

export function useOptionalCalendarChrome() {
  const context = useContext(CalendarChromeContext);
  return context?.chrome ?? null;
}

export function useCalendarChromeRegistration(config: CalendarChromeConfig | null) {
  const context = useContext(CalendarChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  useEffect(() => {
    const setChrome = setChromeRef.current;

    if (!setChrome) {
      return;
    }

    if (!config) {
      setChrome(null);
      return;
    }

    setChrome(config);

    return () => {
      setChrome(null);
    };
  }, [config]);
}
