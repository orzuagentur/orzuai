"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/dashboard";

type RelativeTimeProps = {
  value: string;
  className?: string;
};

/**
 * Renders relative time only after mount to avoid SSR/client hydration drift.
 */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setLabel(formatRelativeTime(value));
    };

    update();

    const intervalId = window.setInterval(update, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [value]);

  return (
    <span className={cn(className)} suppressHydrationWarning>
      {label}
    </span>
  );
}
