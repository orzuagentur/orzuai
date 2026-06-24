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

import type { AiAgentTab } from "@/types/agent-dashboard.types";

export type AiAssistantChromeConfig = {
  activeTab: AiAgentTab;
  onTabChange: (tab: AiAgentTab) => void;
  showTabs: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  showNewAgent?: boolean;
  onNewAgent?: () => void;
};

type AiAssistantChromeContextValue = {
  chrome: AiAssistantChromeConfig | null;
  setChrome: (chrome: AiAssistantChromeConfig | null) => void;
};

export const AiAssistantChromeContext =
  createContext<AiAssistantChromeContextValue | null>(null);

function chromePrimitivesEqual(
  a: AiAssistantChromeConfig,
  b: AiAssistantChromeConfig,
): boolean {
  return (
    a.activeTab === b.activeTab &&
    a.showTabs === b.showTabs &&
    a.searchQuery === b.searchQuery &&
    a.showSearch === b.showSearch &&
    a.showNewAgent === b.showNewAgent
  );
}

export function AiAssistantChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<AiAssistantChromeConfig | null>(
    null,
  );

  const setChrome = useCallback((next: AiAssistantChromeConfig | null) => {
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
        prev.onSearchChange !== next.onSearchChange ||
        prev.onNewAgent !== next.onNewAgent
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
    <AiAssistantChromeContext.Provider value={value}>
      {children}
    </AiAssistantChromeContext.Provider>
  );
}

export function useOptionalAiAssistantChrome() {
  const context = useContext(AiAssistantChromeContext);
  return context?.chrome ?? null;
}

export function useAiAssistantChromeRegistration(
  config: AiAssistantChromeConfig | null,
) {
  const context = useContext(AiAssistantChromeContext);
  const setChromeRef = useRef(context?.setChrome);
  setChromeRef.current = context?.setChrome;

  const enabled =
    config !== null &&
    typeof config.onTabChange === "function" &&
    config.showTabs;

  const activeTab = config?.activeTab ?? "dashboard";
  const showTabs = config?.showTabs ?? false;
  const searchQuery = config?.searchQuery ?? "";
  const showSearch = config?.showSearch ?? false;
  const showNewAgent = config?.showNewAgent ?? false;
  const onTabChange = config?.onTabChange;
  const onSearchChange = config?.onSearchChange;
  const onNewAgent = config?.onNewAgent;

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
      showTabs,
      searchQuery,
      onSearchChange,
      showSearch,
      showNewAgent,
      onNewAgent,
    });

    return () => {
      setChrome(null);
    };
  }, [
    enabled,
    activeTab,
    showTabs,
    searchQuery,
    showSearch,
    showNewAgent,
    onTabChange,
    onSearchChange,
    onNewAgent,
  ]);
}
