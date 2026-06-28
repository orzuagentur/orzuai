"use client";

import Link from "next/link";
import { ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";

import { GoogleCalendarIcon } from "./GoogleCalendarIcon";

type GoogleCalendarHoverMenuProps = {
  connected: boolean;
  calendarLabel?: string | null;
  accountEmail?: string | null;
  lastSyncedAt?: string | null;
  onSync?: () => Promise<void>;
};

const HOVER_CLOSE_DELAY_MS = 180;

function formatLastSynced(value: string | null | undefined): string {
  if (!value) {
    return ORZUX_CALENDAR_MESSAGES.googleSyncNever;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return ORZUX_CALENDAR_MESSAGES.googleSyncNever;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GoogleCalendarHoverMenu({
  connected,
  calendarLabel,
  accountEmail,
  lastSyncedAt,
  onSync,
}: GoogleCalendarHoverMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const handleOpen = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  async function handleSync() {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      if (onSync) {
        await onSync();
      } else {
        const response = await fetch("/api/calendar/google/sync", { method: "POST" });
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          synced?: number;
        };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.googleSyncFailed);
          return;
        }

        toast.success(
          result.synced && result.synced > 0
            ? ORZUX_CALENDAR_MESSAGES.googleSyncSuccessCount(result.synced)
            : ORZUX_CALENDAR_MESSAGES.googleSyncSuccess,
        );
        router.refresh();
      }
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.googleSyncFailed);
    } finally {
      setIsSyncing(false);
    }
  }

  if (!connected) {
    return (
      <Button size="sm" variant="outline" className="hidden gap-2 sm:inline-flex" asChild>
        <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF}>
          <GoogleCalendarIcon size={18} className="object-contain" />
          {ORZUX_CALENDAR_MESSAGES.connectGoogleShort}
        </Link>
      </Button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
      onFocus={handleOpen}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 overflow-hidden p-1.5"
        aria-label={ORZUX_CALENDAR_MESSAGES.openGoogleCalendar}
        aria-expanded={open}
      >
        <GoogleCalendarIcon size={32} className="size-8 object-contain" />
      </Button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-xl border bg-popover p-3 shadow-lg transition-all duration-150",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        onMouseEnter={handleOpen}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <GoogleCalendarIcon size={28} className="object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.googleCalendarConnected}</p>
            {calendarLabel ? (
              <p className="truncate text-xs text-muted-foreground">{calendarLabel}</p>
            ) : null}
            {accountEmail ? (
              <p className="truncate text-xs text-muted-foreground">{accountEmail}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.googleAutoSyncHint}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.googleLastSynced}: {formatLastSynced(lastSyncedAt)}
        </p>

        <div className="mt-3 grid gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            disabled={isSyncing}
            onClick={() => void handleSync()}
          >
            {isSyncing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            {ORZUX_CALENDAR_MESSAGES.googleSyncNow}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            asChild
          >
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-4" />
              {ORZUX_CALENDAR_MESSAGES.openGoogleCalendar}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
