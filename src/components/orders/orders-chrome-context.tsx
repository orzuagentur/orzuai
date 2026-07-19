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

import type { CrmOrderStatus } from "@/types/crm-order.types";

export type OrdersChromeConfig = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  activeStatus: CrmOrderStatus | "all";
  onStatusChange: (status: CrmOrderStatus | "all") => void;
  onAddOrder: () => void;
};

type OrdersChromeContextValue = {
  chrome: OrdersChromeConfig | null;
  setChrome: (chrome: OrdersChromeConfig | null) => void;
};

const OrdersChromeContext = createContext<OrdersChromeContextValue | null>(null);

export function OrdersChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<OrdersChromeConfig | null>(null);

  const setChrome = useCallback((next: OrdersChromeConfig | null) => {
    setChromeState((prev) => {
      if (prev === next) {
        return prev;
      }
      if (
        prev &&
        next &&
        prev.searchQuery === next.searchQuery &&
        prev.activeStatus === next.activeStatus &&
        prev.onSearchChange === next.onSearchChange &&
        prev.onSearchSubmit === next.onSearchSubmit &&
        prev.onStatusChange === next.onStatusChange &&
        prev.onAddOrder === next.onAddOrder
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);

  return (
    <OrdersChromeContext.Provider value={value}>
      {children}
    </OrdersChromeContext.Provider>
  );
}

export function useOptionalOrdersChrome() {
  return useContext(OrdersChromeContext)?.chrome ?? null;
}

export function useOrdersChromeRegistration(config: OrdersChromeConfig) {
  const setChrome = useContext(OrdersChromeContext)?.setChrome;

  const callbacksRef = useRef({
    onSearchChange: config.onSearchChange,
    onSearchSubmit: config.onSearchSubmit,
    onStatusChange: config.onStatusChange,
    onAddOrder: config.onAddOrder,
  });
  callbacksRef.current = {
    onSearchChange: config.onSearchChange,
    onSearchSubmit: config.onSearchSubmit,
    onStatusChange: config.onStatusChange,
    onAddOrder: config.onAddOrder,
  };

  useEffect(() => {
    if (!setChrome) {
      return;
    }

    setChrome({
      searchQuery: config.searchQuery,
      activeStatus: config.activeStatus,
      onSearchChange: (value) => callbacksRef.current.onSearchChange(value),
      onSearchSubmit: () => callbacksRef.current.onSearchSubmit(),
      onStatusChange: (status) => callbacksRef.current.onStatusChange(status),
      onAddOrder: () => callbacksRef.current.onAddOrder(),
    });

    return () => {
      setChrome(null);
    };
  }, [setChrome, config.searchQuery, config.activeStatus]);
}
