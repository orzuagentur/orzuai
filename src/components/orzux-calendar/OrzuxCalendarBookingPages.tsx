"use client";

import Link from "next/link";
import { CalendarClockIcon, ExternalLinkIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES, PUBLIC_ROUTES } from "@/constants/routes";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { getBusinessTypePreset } from "@/lib/calendar/business-type-presets";
import type { BookingPageRecord } from "@/types/booking-page.types";

type OrzuxCalendarBookingPagesProps = {
  pages: BookingPageRecord[];
};

export function OrzuxCalendarBookingPages({ pages }: OrzuxCalendarBookingPagesProps) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.bookingPagesTitle}</h3>
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link href={DASHBOARD_ROUTES.calendarBookingNew} aria-label={ORZUX_CALENDAR_MESSAGES.createBookingPage}>
            <PlusIcon className="size-4" />
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
          <Link href={DASHBOARD_ROUTES.calendarBookingNew}>
            <PlusIcon className="size-4" />
            {ORZUX_CALENDAR_MESSAGES.createBookingPage}
          </Link>
        </Button>
      ) : (
        <div className="space-y-2">
          {pages.slice(0, 4).map((page) => {
            const typeLabel = getBusinessTypePreset(page.businessType).label;

            return (
              <Link
                key={page.id}
                href={`${DASHBOARD_ROUTES.calendarBooking}/${page.id}`}
                className="flex items-start gap-2 rounded-md border bg-background px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {page.title || ORZUX_CALENDAR_MESSAGES.defaultBookingPageName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {page.published
                      ? ORZUX_CALENDAR_MESSAGES.bookingPageActive
                      : ORZUX_CALENDAR_MESSAGES.bookingPageDraft}
                    {" · "}
                    {typeLabel}
                  </p>
                </div>
                {page.published ? (
                  <a
                    href={PUBLIC_ROUTES.book(page.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={ORZUX_CALENDAR_MESSAGES.openPublicPage}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                ) : null}
              </Link>
            );
          })}

          {pages.length > 4 ? (
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href={DASHBOARD_ROUTES.calendarBooking}>
                View all ({pages.length})
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href={DASHBOARD_ROUTES.calendarBooking}>
                {ORZUX_CALENDAR_MESSAGES.manageBookingPages}
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
