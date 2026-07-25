"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isFeatureLocked,
  type ProductLockId,
  type ProductLocksMap,
} from "@/lib/product-locks";

const Ctx = createContext<ProductLocksMap>({});

export function ProductLocksProvider({ children }: { children: ReactNode }) {
  const [locks, setLocks] = useState<ProductLocksMap>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/product-locks", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (cancelled || !res.ok) return;
      setLocks((data.locks || {}) as ProductLocksMap);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={locks}>{children}</Ctx.Provider>;
}

export function useProductLocks() {
  return useContext(Ctx);
}

export function useFeatureLocked(id: ProductLockId) {
  const locks = useProductLocks();
  return useMemo(() => isFeatureLocked(locks, id), [locks, id]);
}
