"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PlatformSupportContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
};

const PlatformSupportContext = createContext<PlatformSupportContextValue | null>(
  null,
);

export function PlatformSupportProvider({
  children,
  initialUnreadCount = 0,
}: {
  children: ReactNode;
  initialUnreadCount?: number;
}) {
  const [isOpen, setIsOpenState] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

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
      unreadCount,
      setUnreadCount,
    }),
    [isOpen, setIsOpen, toggle, unreadCount],
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
