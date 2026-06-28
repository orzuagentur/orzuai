"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { WeeklySchedule } from "@/lib/calendar/weekly-schedule";

type PublicBookingCalendarProps = {
  timeZone: string;
  weeklySchedule: WeeklySchedule;
  advanceBookingDays: number;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
};

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getZonedDayOfWeek(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

function startOfMonth(dateKey: string, timeZone: string): string {
  const [year, month] = dateKey.split("-").map(Number);
  return formatDateKey(new Date(year!, month! - 1, 1), timeZone);
}

function buildMonthGrid(monthStartKey: string, timeZone: string): string[] {
  const monthStart = parseDateKey(monthStartKey);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - getZonedDayOfWeek(monthStart, timeZone));

  const cells: string[] = [];
  for (let index = 0; index < 42; index += 1) {
    const cell = new Date(gridStart);
    cell.setDate(cell.getDate() + index);
    cells.push(formatDateKey(cell, timeZone));
  }

  return cells;
}

function isDateBookable(
  dateKey: string,
  timeZone: string,
  weeklySchedule: WeeklySchedule,
  advanceBookingDays: number,
): boolean {
  const todayKey = formatDateKey(new Date(), timeZone);

  if (dateKey < todayKey) {
    return false;
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceBookingDays);
  const maxKey = formatDateKey(maxDate, timeZone);

  if (dateKey > maxKey) {
    return false;
  }

  const dayOfWeek = getZonedDayOfWeek(parseDateKey(dateKey), timeZone);
  return weeklySchedule[dayOfWeek]?.enabled ?? false;
}

export function PublicBookingCalendar({
  timeZone,
  weeklySchedule,
  advanceBookingDays,
  selectedDate,
  onSelectDate,
}: PublicBookingCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate, timeZone),
  );

  const monthLabel = useMemo(() => {
    const date = parseDateKey(visibleMonth);
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [visibleMonth]);

  const grid = useMemo(
    () => buildMonthGrid(visibleMonth, timeZone),
    [visibleMonth, timeZone],
  );

  const visibleMonthPrefix = visibleMonth.slice(0, 7);

  function goPrevMonth() {
    const [year, month] = visibleMonth.split("-").map(Number);
    const prev = new Date(year!, month! - 2, 1);
    setVisibleMonth(formatDateKey(prev, timeZone));
  }

  function goNextMonth() {
    const [year, month] = visibleMonth.split("-").map(Number);
    const next = new Date(year!, month!, 1);
    setVisibleMonth(formatDateKey(next, timeZone));
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-medium">{ORZUX_CALENDAR_MESSAGES.publicBookSelectDate}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background hover:bg-muted"
            onClick={goPrevMonth}
            aria-label={ORZUX_CALENDAR_MESSAGES.prevMonth}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-medium">{monthLabel}</span>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background hover:bg-muted"
            onClick={goNextMonth}
            aria-label={ORZUX_CALENDAR_MESSAGES.nextMonth}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((dateKey) => {
          const dayNumber = Number.parseInt(dateKey.slice(8, 10), 10);
          const inMonth = dateKey.startsWith(visibleMonthPrefix);
          const bookable = isDateBookable(
            dateKey,
            timeZone,
            weeklySchedule,
            advanceBookingDays,
          );
          const isSelected = dateKey === selectedDate;
          const todayKey = formatDateKey(new Date(), timeZone);
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!bookable}
              title={
                !bookable
                  ? dateKey < todayKey
                    ? ORZUX_CALENDAR_MESSAGES.publicBookPastDate
                    : ORZUX_CALENDAR_MESSAGES.publicBookClosedDay
                  : undefined
              }
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                bookable && !isSelected && "hover:bg-muted",
                !bookable &&
                  "cursor-not-allowed text-muted-foreground/35 line-through decoration-muted-foreground/30",
                isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary",
                isToday && !isSelected && bookable && "ring-1 ring-primary/40",
              )}
              onClick={() => bookable && onSelectDate(dateKey)}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
