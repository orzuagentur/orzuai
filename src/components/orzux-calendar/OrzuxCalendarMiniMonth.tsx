"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";

import {
  addMonths,
  getMonthGridDays,
  isSameDay,
  isSameMonth,
} from "./utils";

type OrzuxCalendarMiniMonthProps = {
  selectedDate: Date;
  visibleMonth: Date;
  onSelectDate: (date: Date) => void;
  onVisibleMonthChange: (month: Date) => void;
  daysWithEvents?: Set<string>;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function OrzuxCalendarMiniMonth({
  selectedDate,
  visibleMonth,
  onSelectDate,
  onVisibleMonthChange,
  daysWithEvents,
}: OrzuxCalendarMiniMonthProps) {
  const days = getMonthGridDays(visibleMonth);
  const today = new Date();

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="select-none space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={ORZUX_CALENDAR_MESSAGES.prevMonth}
            onClick={() => onVisibleMonthChange(addMonths(visibleMonth, -1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={ORZUX_CALENDAR_MESSAGES.nextMonth}
            onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const selected = isSameDay(day, selectedDate);
          const todayMatch = isSameDay(day, today);
          const hasEvents = daysWithEvents?.has(day.toDateString());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                onSelectDate(day);
                if (!isSameMonth(day, visibleMonth)) {
                  onVisibleMonthChange(new Date(day.getFullYear(), day.getMonth(), 1));
                }
              }}
              className={cn(
                "relative mx-auto flex size-8 items-center justify-center rounded-full text-xs transition-colors",
                !inMonth && "text-muted-foreground/50",
                inMonth && "hover:bg-muted",
                selected && "bg-primary text-primary-foreground hover:bg-primary",
                !selected && todayMatch && "bg-primary/10 font-semibold text-primary",
              )}
            >
              {day.getDate()}
              {hasEvents && !selected ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
