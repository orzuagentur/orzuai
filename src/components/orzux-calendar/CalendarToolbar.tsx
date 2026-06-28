"use client";

import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  MenuIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";

import type { CalendarChromeConfig } from "./calendar-chrome-context";
import { GoogleCalendarIcon } from "./GoogleCalendarIcon";
import { OrzuxCalendarPageIcon } from "./OrzuxCalendarPageIcon";

type CalendarToolbarProps = {
  chrome: CalendarChromeConfig;
};

export function CalendarToolbar({ chrome }: CalendarToolbarProps) {
  const pageTitle =
    chrome.variant === "day" ? chrome.pageTitle : chrome.title;
  const dateLabel =
    chrome.variant === "day" ? chrome.dateLabel : chrome.weekLabel;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {chrome.variant === "day" ? (
          <div className="flex shrink-0 items-center gap-2">
            <OrzuxCalendarPageIcon size={28} className="size-7 shrink-0 object-contain" />
            <h1 className="truncate text-base font-medium sm:text-lg">{pageTitle}</h1>
          </div>
        ) : (
          <h1 className="truncate text-base font-medium sm:text-lg">{pageTitle}</h1>
        )}

        <Button variant="outline" size="sm" onClick={chrome.onToday}>
          {ORZUX_CALENDAR_MESSAGES.today}
        </Button>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={ORZUX_CALENDAR_MESSAGES.prevDay}
            onClick={chrome.onPrev}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={ORZUX_CALENDAR_MESSAGES.nextDay}
            onClick={chrome.onNext}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <p className="truncate text-sm capitalize text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {chrome.variant === "day" ? (
          <>
            {(chrome.calendarLabel || chrome.accountEmail) && chrome.googleConnected ? (
              <p className="hidden max-w-[200px] truncate text-xs text-muted-foreground xl:block">
                {[chrome.calendarLabel, chrome.accountEmail].filter(Boolean).join(" · ")}
              </p>
            ) : null}

            {chrome.googleConnected ? (
              <div className="group relative">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 overflow-hidden p-1"
                  aria-label={ORZUX_CALENDAR_MESSAGES.openGoogleCalendar}
                >
                  <GoogleCalendarIcon className="size-6" />
                </Button>
                <div className="invisible absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border bg-popover p-1 opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                    disabled={chrome.isRefreshing}
                    onClick={chrome.onRefresh}
                  >
                    {chrome.isRefreshing ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-4" />
                    )}
                    {ORZUX_CALENDAR_MESSAGES.refresh}
                  </button>
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                  >
                    <GoogleCalendarIcon className="size-4" />
                    {ORZUX_CALENDAR_MESSAGES.openGoogleCalendar}
                  </a>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF}>
                  {ORZUX_CALENDAR_MESSAGES.connectGoogleHint}
                </Link>
              </Button>
            )}

            {!chrome.sidebarOpen ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                aria-label={ORZUX_CALENDAR_MESSAGES.openSidebar}
                onClick={chrome.onOpenSidebar}
              >
                <MenuIcon className="size-4" />
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
