"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";

import type { CalendarChromeConfig } from "./calendar-chrome-context";
import { GoogleCalendarHoverMenu } from "./GoogleCalendarHoverMenu";
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
    <div className="hidden min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {chrome.variant === "day" ? (
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <OrzuxCalendarPageIcon size={36} className="size-9 object-contain" />
            </span>
            <h1 className="truncate text-base font-semibold sm:text-lg">{pageTitle}</h1>
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
            <GoogleCalendarHoverMenu
              connected={chrome.googleConnected}
              calendarLabel={chrome.calendarLabel}
              accountEmail={chrome.accountEmail}
              lastSyncedAt={chrome.lastSyncedAt}
            />

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
