"use client";

import { useEffect, useMemo, useRef } from "react";
import { CalendarClockIcon } from "lucide-react";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import {
  BOOKING_CHIP_GAP_PX,
  BOOKING_CHIP_SIZE_PX,
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  dateTimeFromGridClick,
  eventOccursOnDay,
  formatDayColumnHeader,
  formatTimeRange,
  getBookingChipColor,
  isSameDay,
  layoutTimedEventsInColumns,
} from "./utils";

type OrzuxCalendarDayGridProps = {
  selectedDate: Date;
  events: OrzuxCalendarEvent[];
  timeZone: string;
  onEventClick?: (event: OrzuxCalendarEvent) => void;
  onSlotClick?: (time: Date) => void;
};

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function getCurrentTimeLineTop(now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 60) * HOUR_HEIGHT_PX;
}

function getBookingTooltip(event: OrzuxCalendarEvent): string {
  const parts = [event.summary || ORZUX_CALENDAR_MESSAGES.bookingBadge];
  if (event.resourceName) parts.push(event.resourceName);
  parts.push(formatTimeRange(event.start, event.end));
  return parts.join(" · ");
}

export function OrzuxCalendarDayGrid({
  selectedDate,
  events,
  timeZone,
  onEventClick,
  onSlotClick,
}: OrzuxCalendarDayGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(selectedDate, new Date());
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );

  const bookingEvents = useMemo(
    () =>
      events.filter(
        (event) => event.isBooking && eventOccursOnDay(event, selectedDate) && !event.isAllDay,
      ),
    [events, selectedDate],
  );

  const bookingLayouts = useMemo(
    () => layoutTimedEventsInColumns(bookingEvents, selectedDate),
    [bookingEvents, selectedDate],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const targetHour = isToday ? new Date().getHours() : 8;
    container.scrollTop = Math.max(0, (targetHour - 1) * HOUR_HEIGHT_PX);
  }, [selectedDate, isToday]);

  const gridHeight = hours.length * HOUR_HEIGHT_PX;

  function handleGridClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!onSlotClick || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const offsetY = event.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    onSlotClick(dateTimeFromGridClick(selectedDate, offsetY));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex border-b bg-muted/30">
        <div className="w-16 shrink-0 border-r px-2 py-3 text-[10px] text-muted-foreground">
          {timeZone}
        </div>
        <div className="flex min-w-0 flex-1 flex-col px-3 py-2">
          <span className="text-xs uppercase text-muted-foreground">
            {formatDayColumnHeader(selectedDate).split(" ")[0]}
          </span>
          <span
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full text-2xl font-normal tabular-nums",
              isToday && "bg-primary text-primary-foreground",
            )}
          >
            {selectedDate.getDate()}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ minHeight: gridHeight }}>
          <div className="w-16 shrink-0 border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b text-right text-xs text-muted-foreground"
                style={{ height: HOUR_HEIGHT_PX }}
              >
                {hour > 0 ? (
                  <span className="absolute -top-2.5 right-2">{formatHourLabel(hour)}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            className="relative min-w-0 flex-1 cursor-pointer"
            onClick={handleGridClick}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-border/60"
                style={{ height: HOUR_HEIGHT_PX }}
              />
            ))}

            {bookingLayouts.map(({ item: event, top, column }) => {
              const color = getBookingChipColor(event.resourceId ?? event.recordId);
              const left = 6 + column * (BOOKING_CHIP_SIZE_PX + BOOKING_CHIP_GAP_PX);

              return (
                <button
                  key={event.id}
                  type="button"
                  title={getBookingTooltip(event)}
                  aria-label={getBookingTooltip(event)}
                  className="absolute flex items-center justify-center rounded-md shadow-sm ring-1 ring-black/10 transition hover:scale-110 hover:brightness-110"
                  style={{
                    top: top - BOOKING_CHIP_SIZE_PX / 2,
                    left,
                    width: BOOKING_CHIP_SIZE_PX,
                    height: BOOKING_CHIP_SIZE_PX,
                    backgroundColor: color,
                    zIndex: 3,
                  }}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  <CalendarClockIcon className="size-3 text-white" strokeWidth={2.5} />
                </button>
              );
            })}

            {isToday ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: getCurrentTimeLineTop(new Date()) }}
              >
                <span className="size-2.5 -translate-x-1 rounded-full bg-red-500" />
                <span className="h-px flex-1 bg-red-500" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {bookingEvents.length === 0 ? (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.emptyDay}
        </div>
      ) : null}
    </div>
  );
}
