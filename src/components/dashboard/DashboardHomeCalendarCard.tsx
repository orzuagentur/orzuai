"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon } from "lucide-react";

import { OrzuxCalendarMiniMonth } from "@/components/orzux-calendar/OrzuxCalendarMiniMonth";
import { toDateQueryParam } from "@/components/orzux-calendar/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type DashboardHomeCalendarCardProps = {
  eventDayKeys: string[];
  className?: string;
};

export function DashboardHomeCalendarCard({
  eventDayKeys,
  className,
}: DashboardHomeCalendarCardProps) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const daysWithEvents = useMemo(
    () => new Set(eventDayKeys),
    [eventDayKeys],
  );

  const todayLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function openDayInCalendar(day: Date) {
    setSelectedDate(day);
    router.push(
      `${DASHBOARD_ROUTES.calendar}?date=${toDateQueryParam(day)}`,
    );
  }

  return (
    <Card
      className={cn(
        "flex h-full max-h-full min-h-0 flex-col overflow-hidden shadow-none",
        className,
      )}
    >
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Calendar</CardTitle>
            <CardDescription className="truncate">{todayLabel}</CardDescription>
          </div>
          <Link
            href={DASHBOARD_ROUTES.calendar}
            className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/15"
            title="Open calendar"
          >
            <CalendarDaysIcon className="size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-hidden pt-0">
        <div className="w-full max-w-[280px]">
          <OrzuxCalendarMiniMonth
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onSelectDate={openDayInCalendar}
            onVisibleMonthChange={setVisibleMonth}
            daysWithEvents={daysWithEvents}
            size="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}
