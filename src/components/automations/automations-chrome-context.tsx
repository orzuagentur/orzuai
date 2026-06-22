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

import type { AutomationsTab } from "@/utils/automations-url";

export type AutomationsChromeConfig = {
  activeTab: AutomationsTab;
  onTabChange: (tab: AutomationsTab) => void;
  onEnableRecommended?: () => void;
  isEnablingRecommended?: boolean;
};

type AutomationsChromeContextValue = {
  chrome: AutomationsChromeConfig | null;
  setChrome: (chrome: AutomationsChromeConfig | null) => void;
};

export const AutomationsChromeContext =
  createContext<AutomationsChromeContextValue | null>(null);

function chromePrimitivesEqual(
  a: AutomationsChromeConfig,
  b: AutomationsChromeConfig,
): boolean {
  return (
    a.activeTab === b.activeTab &&
    a.isEnablingRecommended === b.isEnablingRecommended
  );
}

export function AutomationsChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<AutomationsChromeConfig | null>(null);

  const setChrome = useCallback((next: AutomationsChromeConfig | null) => {
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
        prev.onTabChange !== next.onTabChange ||
        prev.onEnableRecommended !== next.onEnableRecommended
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
    <AutomationsChromeContext.Provider value={value}>
      {children}
    </AutomationsChromeContext.Provider>
  );
}

export function useOptionalAutomationsChrome() {
  const context = useContext(AutomationsChromeContext);
  return context?.chrome ?? null;
}

export function useAutomationsChromeRegistration(
  config: AutomationsChromeConfig | null,
) {
  const context = useContext(AutomationsChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  const activeTab = config?.activeTab ?? "overview";
  const isEnablingRecommended = config?.isEnablingRecommended ?? false;
  const onTabChange = config?.onTabChange;
  const onEnableRecommended = config?.onEnableRecommended;
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
      onEnableRecommended,
      isEnablingRecommended,
    });

    return () => {
      setChrome(null);
    };
  }, [
    activeTab,
    enabled,
    isEnablingRecommended,
    onEnableRecommended,
    onTabChange,
  ]);
}
