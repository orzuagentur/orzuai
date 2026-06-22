"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PlatformCopilotContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
};

const PlatformCopilotContext = createContext<PlatformCopilotContextValue | null>(
  null,
);

export function PlatformCopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpenState] = useState(false);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
  }, []);

  const toggle = useCallback(() => {
    setIsOpenState((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggle,
    }),
    [isOpen, setIsOpen, toggle],
  );

  return (
    <PlatformCopilotContext.Provider value={value}>
      {children}
    </PlatformCopilotContext.Provider>
  );
}

export function usePlatformCopilot() {
  const context = useContext(PlatformCopilotContext);

  if (!context) {
    throw new Error("usePlatformCopilot must be used within PlatformCopilotProvider");
  }

  return context;
}
