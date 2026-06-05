"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function usePollingRefresh(intervalMs = 5000) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, router]);
}
