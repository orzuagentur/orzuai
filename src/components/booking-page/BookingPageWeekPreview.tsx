"use client";

import { useMemo } from "react";

import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import {
  timeToMinutes,
  WEEKDAY_LABELS,
  type WeeklySchedule,
} from "@/lib/calendar/weekly-schedule";

import { addDays, isSameDay, startOfDay } from "@/components/orzux-calendar/utils";

const PREVIEW_HOUR_START = 7;
const PREVIEW_HOUR_END = 20;
const PREVIEW_HOUR_HEIGHT = 48;

type BookingPageWeekPreviewProps = {
  weekStart: Date;
  schedule: WeeklySchedule;
  timeZone: string;
};

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 12) return "12";
  if (hour < 12) return String(hour);
  return String(hour - 12);
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString(undefined, { month: "long" });
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: "long" });
  const year = weekStart.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${year}`;
  }

  return `${startMonth} – ${endMonth} ${year}`;
}

export function BookingPageWeekPreview({
  weekStart,
  schedule,
  timeZone,
}: BookingPageWeekPreviewProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const hours = useMemo(
    () =>
      Array.from(
        { length: PREVIEW_HOUR_END - PREVIEW_HOUR_START },
        (_, index) => PREVIEW_HOUR_START + index,
      ),
    [],
  );

  const gridHeight = hours.length * PREVIEW_HOUR_HEIGHT;
  const today = startOfDay(new Date());

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">{ORZUX_CALENDAR_MESSAGES.previewLabel}</p>
        <p className="text-lg capitalize">{formatWeekRange(weekStart)}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[720px]">
          <div className="sticky top-0 z-10 flex border-b bg-card">
            <div className="w-14 shrink-0 border-r px-1 py-2 text-[10px] text-muted-foreground">
              {timeZone}
            </div>
            {days.map((day) => {
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  className="min-w-0 flex-1 border-r px-2 py-2 text-center last:border-r-0"
                >
                  <p className="text-[11px] uppercase text-muted-foreground">
                    {WEEKDAY_LABELS[day.getDay()]}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative flex" style={{ minHeight: gridHeight }}>
            <div className="w-14 shrink-0 border-r">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="relative border-b text-right text-[11px] text-muted-foreground"
                  style={{ height: PREVIEW_HOUR_HEIGHT }}
                >
                  <span className="absolute -top-2.5 right-1.5">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const daySchedule = schedule[day.getDay()];
              const enabled = daySchedule?.enabled ?? false;
              const startMinutes = timeToMinutes(daySchedule?.start ?? "09:00");
              const endMinutes = timeToMinutes(daySchedule?.end ?? "17:00");
              const top =
                ((startMinutes - PREVIEW_HOUR_START * 60) / 60) * PREVIEW_HOUR_HEIGHT;
              const height = ((endMinutes - startMinutes) / 60) * PREVIEW_HOUR_HEIGHT;

              return (
                <div
                  key={`grid-${day.toISOString()}`}
                  className="relative min-w-0 flex-1 border-r last:border-r-0"
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border/60"
                      style={{ height: PREVIEW_HOUR_HEIGHT }}
                    />
                  ))}

                  {enabled && height > 0 ? (
                    <div
                      className="absolute inset-x-1 rounded-md border border-sky-500/40 bg-sky-500/20"
                      style={{
                        top: Math.max(0, top),
                        height: Math.max(height, 24),
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
