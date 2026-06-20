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

export type AiAssistantChromeConfig = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewAgent?: () => void;
  showSearch: boolean;
  showNewAgent: boolean;
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
    config !== null && typeof config.onSearchChange === "function";

  const searchQuery = config?.searchQuery ?? "";
  const showSearch = config?.showSearch ?? false;
  const showNewAgent = config?.showNewAgent ?? false;
  const onSearchChange = config?.onSearchChange;
  const onNewAgent = config?.onNewAgent;

  useEffect(() => {
    const setChrome = setChromeRef.current;

    if (!setChrome) {
      return;
    }

    if (!enabled || !onSearchChange) {
      setChrome(null);
      return;
    }

    setChrome({
      searchQuery,
      onSearchChange,
      onNewAgent,
      showSearch,
      showNewAgent,
    });

    return () => {
      setChrome(null);
    };
  }, [
    enabled,
    searchQuery,
    showSearch,
    showNewAgent,
    onSearchChange,
    onNewAgent,
  ]);
}
