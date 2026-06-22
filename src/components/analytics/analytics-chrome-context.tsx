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

import type { AnalyticsTab } from "@/utils/analytics-url";

export type AnalyticsChromeConfig = {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
};

type AnalyticsChromeContextValue = {
  chrome: AnalyticsChromeConfig | null;
  setChrome: (chrome: AnalyticsChromeConfig | null) => void;
};

export const AnalyticsChromeContext =
  createContext<AnalyticsChromeContextValue | null>(null);

export function AnalyticsChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<AnalyticsChromeConfig | null>(null);

  const setChrome = useCallback((next: AnalyticsChromeConfig | null) => {
    setChromeState((prev) => {
      if (prev === null && next === null) {
        return prev;
      }

      if (prev === null || next === null) {
        return next;
      }

      if (prev.activeTab !== next.activeTab) {
        return next;
      }

      if (prev.onTabChange !== next.onTabChange) {
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
    <AnalyticsChromeContext.Provider value={value}>
      {children}
    </AnalyticsChromeContext.Provider>
  );
}

export function useOptionalAnalyticsChrome() {
  const context = useContext(AnalyticsChromeContext);
  return context?.chrome ?? null;
}

export function useAnalyticsChromeRegistration(config: AnalyticsChromeConfig | null) {
  const context = useContext(AnalyticsChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  const activeTab = config?.activeTab ?? "pulse";
  const onTabChange = config?.onTabChange;
  const enabled = config !== null && typeof onTabChange === "function";

  useEffect(() => {
    const setChrome = setChromeRef.current;

    if (!setChrome) {
      return;
    }

    if (!enabled || !onTabChange) {
      setChrome(null);
      return;
    }

    setChrome({
      activeTab,
      onTabChange,
    });

    return () => {
      setChrome(null);
    };
  }, [activeTab, enabled, onTabChange]);
}
