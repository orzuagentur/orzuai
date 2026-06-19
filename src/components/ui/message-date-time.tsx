"use client";

import { cn } from "@/lib/utils";
import { formatMessageDateTime } from "@/utils/dashboard";

type MessageDateTimeProps = {
  value: string;
  className?: string;
};

export function MessageDateTime({ value, className }: MessageDateTimeProps) {
  return (
    <time
      dateTime={value}
      className={cn(className)}
      suppressHydrationWarning
    >
      {formatMessageDateTime(value)}
    </time>
  );
}
