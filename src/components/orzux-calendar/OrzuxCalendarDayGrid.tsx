"use client";

import { useEffect, useMemo, useRef } from "react";
import { ExternalLinkIcon } from "lucide-react";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  eventOccursOnDay,
  formatDayColumnHeader,
  formatTimeRange,
  getTimedEventLayout,
  isSameDay,
} from "./utils";

type AvailabilitySlot = {
  label: string;
  start: string;
  end: string;
};

type OrzuxCalendarDayGridProps = {
  selectedDate: Date;
  events: OrzuxCalendarEvent[];
  slots: AvailabilitySlot[];
  timeZone: string;
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

export function OrzuxCalendarDayGrid({
  selectedDate,
  events,
  slots,
  timeZone,
}: OrzuxCalendarDayGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(selectedDate, new Date());
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    [],
  );

  const dayEvents = useMemo(
    () => events.filter((event) => eventOccursOnDay(event, selectedDate)),
    [events, selectedDate],
  );

  const allDayEvents = dayEvents.filter((event) => event.isAllDay);
  const timedEvents = dayEvents.filter((event) => !event.isAllDay);

  const daySlots = useMemo(
    () =>
      slots.filter((slot) =>
        isSameDay(new Date(slot.start), selectedDate),
      ),
    [slots, selectedDate],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const targetHour = isToday ? new Date().getHours() : 8;
    container.scrollTop = Math.max(0, (targetHour - 1) * HOUR_HEIGHT_PX);
  }, [selectedDate, isToday]);

  const gridHeight = hours.length * HOUR_HEIGHT_PX;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
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
          <div className="flex flex-1 flex-wrap gap-1 p-2">
            {allDayEvents.map((event) => (
              <EventChip key={event.id} event={event} compact />
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
                className="relative border-b text-right text-[11px] text-muted-foreground"
                style={{ height: HOUR_HEIGHT_PX }}
              >
                {hour > 0 ? (
                  <span className="absolute -top-2.5 right-2">{formatHourLabel(hour)}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-border/60"
                style={{ height: HOUR_HEIGHT_PX }}
              />
            ))}

            {daySlots.map((slot) => {
              const layout = getTimedEventLayout(slot, selectedDate);
              if (!layout) return null;

              return (
                <div
                  key={slot.start}
                  className="pointer-events-none absolute inset-x-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300"
                  style={{
                    top: layout.top,
                    height: layout.height,
                    zIndex: 1,
                  }}
                >
                  {ORZUX_CALENDAR_MESSAGES.openSlot}
                </div>
              );
            })}

            {timedEvents.map((event) => {
              const layout = getTimedEventLayout(event, selectedDate);
              if (!layout) return null;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-[11px] shadow-sm",
                    event.isTask
                      ? "border-amber-500/40 bg-amber-500/15"
                      : event.source === "local"
                        ? "border-violet-500/40 bg-violet-500/15"
                        : "border-blue-500/40 bg-blue-500/15",
                  )}
                  style={{
                    top: layout.top,
                    height: layout.height,
                    zIndex: 2,
                  }}
                >
                  <p className="truncate font-medium leading-tight">{event.summary}</p>
                  <p className="truncate text-muted-foreground">
                    {formatTimeRange(event.start, event.end)}
                  </p>
                  {event.htmlLink ? (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-1 top-1 rounded p-0.5 hover:bg-background/60"
                      aria-label={ORZUX_CALENDAR_MESSAGES.openInGoogle}
                    >
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : null}
                </div>
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

      {dayEvents.length === 0 && daySlots.length === 0 ? (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.emptyDay}
        </div>
      ) : null}
    </div>
  );
}

function EventChip({
  event,
  compact = false,
}: {
  event: OrzuxCalendarEvent;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-blue-500/40 bg-blue-500/15 px-2 py-1 text-xs font-medium",
        compact && "max-w-full truncate",
      )}
    >
      {event.summary}
    </div>
  );
}
