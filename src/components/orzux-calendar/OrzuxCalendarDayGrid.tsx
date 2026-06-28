"use client";

import { useEffect, useMemo, useRef } from "react";
import { CalendarClockIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import {
  BOOKING_CHIP_SIZE_PX,
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  dateTimeFromGridClick,
  eventOccursOnDay,
  formatDayColumnHeader,
  formatEventDateTimeRange,
  formatTimeRange,
  getBookingChipColor,
  getColumnEventStyle,
  isSameDay,
  layoutTimedEventsInColumns,
} from "./utils";

type OrzuxCalendarDayGridProps = {
  selectedDate: Date;
  events: OrzuxCalendarEvent[];
  timeZone: string;
  onEventClick?: (event: OrzuxCalendarEvent) => void;
  onSlotClick?: (time: Date) => void;
  onTaskStatusChange?: (event: OrzuxCalendarEvent, status: "open" | "done") => void;
  updatingTaskId?: string | null;
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
  parts.push(formatEventDateTimeRange(event.start, event.end));
  return parts.join(" · ");
}

export function OrzuxCalendarDayGrid({
  selectedDate,
  events,
  timeZone,
  onEventClick,
  onSlotClick,
  onTaskStatusChange,
  updatingTaskId = null,
}: OrzuxCalendarDayGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(selectedDate, new Date());
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );

  const dayEvents = useMemo(
    () => events.filter((event) => eventOccursOnDay(event, selectedDate)),
    [events, selectedDate],
  );
  const allDayEvents = dayEvents.filter((event) => event.isAllDay);
  const timedEvents = dayEvents.filter((event) => !event.isAllDay);

  const eventLayouts = useMemo(
    () => layoutTimedEventsInColumns(timedEvents, selectedDate),
    [timedEvents, selectedDate],
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

      {allDayEvents.length > 0 ? (
        <div className="flex border-b bg-muted/20">
          <div className="w-16 shrink-0 border-r px-2 py-2 text-[10px] text-muted-foreground">
            {ORZUX_CALENDAR_MESSAGES.allDay}
          </div>
          <div className="flex flex-1 flex-wrap gap-1.5 p-2">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className="max-w-full truncate rounded-md border border-blue-500/40 bg-blue-500/15 px-2.5 py-1.5 text-sm font-medium hover:bg-blue-500/25"
                onClick={() => onEventClick?.(event)}
              >
                {event.summary}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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

            {eventLayouts.map(({ item: event, top, height, column, columnCount }) => {
              const position = getColumnEventStyle(column, columnCount);

              if (event.isBooking) {
                const color = getBookingChipColor(event.resourceId ?? event.recordId);

                return (
                  <button
                    key={event.id}
                    type="button"
                    title={getBookingTooltip(event)}
                    aria-label={getBookingTooltip(event)}
                    className="absolute flex flex-col items-center rounded-md shadow-sm ring-1 ring-black/10 transition hover:brightness-110"
                    style={{
                      top,
                      height: Math.max(height, BOOKING_CHIP_SIZE_PX),
                      left: position.left,
                      width: BOOKING_CHIP_SIZE_PX,
                      backgroundColor: color,
                      zIndex: 2,
                    }}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    <CalendarClockIcon
                      className="mt-1 size-3 shrink-0 text-white"
                      strokeWidth={2.5}
                    />
                  </button>
                );
              }

              const isDoneTask = event.isTask && event.taskStatus === "done";

              return (
                <button
                  key={event.id}
                  type="button"
                  className={cn(
                    "absolute overflow-hidden rounded-md border px-2 py-1 text-left shadow-sm transition hover:brightness-95",
                    event.isTask
                      ? isDoneTask
                        ? "border-amber-500/25 bg-amber-500/5 opacity-70"
                        : "border-amber-500/40 bg-amber-500/15"
                      : event.source === "local"
                        ? "border-violet-500/40 bg-violet-500/15"
                        : "border-blue-500/40 bg-blue-500/15",
                  )}
                  style={{
                    top,
                    height,
                    left: position.left,
                    width: position.width,
                    zIndex: 2,
                  }}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  {event.isTask ? (
                    <button
                      type="button"
                      aria-label={
                        isDoneTask
                          ? ORZUX_CALENDAR_MESSAGES.taskMarkUndone
                          : ORZUX_CALENDAR_MESSAGES.taskMarkDone
                      }
                      title={
                        isDoneTask
                          ? ORZUX_CALENDAR_MESSAGES.taskMarkUndone
                          : ORZUX_CALENDAR_MESSAGES.taskMarkDone
                      }
                      disabled={updatingTaskId === event.recordId}
                      className={cn(
                        "absolute left-1.5 top-1.5 z-[1] flex size-4 items-center justify-center rounded-full border-2 bg-background/90 transition hover:scale-110 disabled:opacity-60",
                        isDoneTask
                          ? "border-amber-600/80 bg-amber-500/90 text-white"
                          : "border-amber-700/70 hover:border-amber-700 hover:bg-amber-50 dark:border-amber-300/80 dark:hover:bg-amber-950/40",
                        updatingTaskId === event.recordId && "animate-pulse",
                      )}
                      onClick={(toggleEvent) => {
                        toggleEvent.stopPropagation();
                        onTaskStatusChange?.(event, isDoneTask ? "open" : "done");
                      }}
                    >
                      {isDoneTask ? <CheckIcon className="size-2.5" strokeWidth={3} /> : null}
                    </button>
                  ) : null}
                  <p
                    className={cn(
                      "truncate text-xs font-semibold leading-snug",
                      event.isTask && "pl-5",
                      isDoneTask && "line-through decoration-amber-700/60",
                    )}
                  >
                    {event.summary}
                  </p>
                  <p
                    className={cn(
                      "truncate text-[10px] text-muted-foreground",
                      event.isTask && "pl-5",
                      isDoneTask && "line-through opacity-70",
                    )}
                  >
                    {formatTimeRange(event.start, event.end)}
                  </p>
                  {event.htmlLink ? (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-1 top-1 rounded p-0.5 hover:bg-background/60"
                      aria-label={ORZUX_CALENDAR_MESSAGES.openInGoogle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : null}
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

      {dayEvents.length === 0 ? (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.emptyDay}
        </div>
      ) : null}
    </div>
  );
}
