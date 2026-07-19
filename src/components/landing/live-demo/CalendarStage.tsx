"use client";

import {
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNestedScrollPassthrough } from "@/hooks/use-nested-scroll-passthrough";
import type { LandingLiveEvent } from "@/features/landing/demo";
import { cn } from "@/lib/utils";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

type CalendarStageProps = {
  event: LandingLiveEvent;
  allEvents: LandingLiveEvent[];
  compact?: boolean;
};

type CreateKind = "booking" | "event" | "task";

const DAY_START = 8;
const DAY_END = 20;
const HOUR_PX = 56;
const HOUR_PX_COMPACT = 44;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function atHour(day: Date, hour: number, minute = 0): Date {
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)}–${fmt(end)}`;
}

function buildSeedEvents(
  day: Date,
  allEvents: LandingLiveEvent[],
): OrzuxCalendarEvent[] {
  const seeded: OrzuxCalendarEvent[] = [];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (const item of allEvents) {
    for (const booking of item.bookings ?? []) {
      if (booking.status === "busy") continue;
      const [hours, minutes] = booking.time.split(":").map(Number);
      const start = atHour(day, hours ?? 10, minutes ?? 0);
      const end = new Date(start.getTime() + 45 * 60 * 1000);
      seeded.push({
        id: `${booking.id}-${day.toDateString()}`,
        recordId: booking.id,
        kind: "booking",
        summary: booking.title,
        description: null,
        location: null,
        start: toIso(start),
        end: toIso(end),
        isAllDay: false,
        htmlLink: null,
        source: "local",
        isBooking: true,
        customerName: booking.customer || item.customer,
        timezone: timeZone,
      });
    }
  }

  const taskStart = atHour(day, 14, 0);
  seeded.push({
    id: `demo-task-followup-${day.toDateString()}`,
    recordId: "demo-task-followup",
    kind: "task",
    summary: "Send confirmation SMS",
    description: "Post-call follow-up",
    location: null,
    start: toIso(taskStart),
    end: toIso(new Date(taskStart.getTime() + 30 * 60 * 1000)),
    isAllDay: false,
    htmlLink: null,
    source: "local",
    isTask: true,
    taskStatus: "open",
    timezone: timeZone,
  });

  return seeded;
}

export function CalendarStage({ event, allEvents, compact = false }: CalendarStageProps) {
  const { copy } = useLandingLocale();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [eventsByDay, setEventsByDay] = useState<Record<string, OrzuxCalendarEvent[]>>({});
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [hour, setHour] = useState("15");
  const [minute, setMinute] = useState("30");
  const scrollRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(scrollRef);
  const liveTickRef = useRef(0);
  const [liveFlashId, setLiveFlashId] = useState<string | null>(null);

  const dayKey = selectedDate.toDateString();
  const hourPx = compact ? HOUR_PX_COMPACT : HOUR_PX;
  const hours = useMemo(
    () => Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i),
    [],
  );

  const events = useMemo(() => {
    if (eventsByDay[dayKey]) return eventsByDay[dayKey]!;
    return buildSeedEvents(selectedDate, allEvents);
  }, [allEvents, dayKey, eventsByDay, selectedDate]);

  useEffect(() => {
    if (createKind !== null) return;

    const names = ["Amina", "Daniil", "Mira", "Visitor", "Elena", "Marcus", "Sara", "Omar"];
    const titles = [
      "Consultation",
      "Discovery call",
      "Follow-up SMS",
      "Pricing review",
      "Clinic tour",
      "Onboarding",
      "Demo walkthrough",
      "Reschedule",
    ];

    const timer = window.setInterval(() => {
      liveTickRef.current += 1;
      const tick = liveTickRef.current;
      const mode = tick % 4;

      setEventsByDay((prev) => {
        const base = prev[dayKey] ?? buildSeedEvents(selectedDate, allEvents);
        let next = [...base];

        if (mode === 0 || mode === 2) {
          const hourValue = 9 + (tick % 10);
          const minuteValue = (tick * 7) % 60;
          const start = atHour(selectedDate, hourValue, minuteValue);
          const isTask = mode === 2;
          const id = `live-${isTask ? "task" : "booking"}-${tick}`;
          const created: OrzuxCalendarEvent = {
            id,
            recordId: id,
            kind: isTask ? "task" : "booking",
            summary: titles[tick % titles.length]!,
            description: null,
            location: null,
            start: toIso(start),
            end: toIso(new Date(start.getTime() + (isTask ? 30 : 45) * 60 * 1000)),
            isAllDay: false,
            htmlLink: null,
            source: "local",
            isBooking: !isTask,
            isTask,
            taskStatus: isTask ? "open" : undefined,
            customerName: isTask ? null : names[tick % names.length]!,
            timezone: timeZone,
          };
          next = [...next, created];
          setLiveFlashId(id);
        } else if (mode === 1) {
          const openTask = [...next].reverse().find(
            (item) => item.isTask && item.taskStatus !== "done",
          );
          if (openTask) {
            next = next.map((item) =>
              item.id === openTask.id ? { ...item, taskStatus: "done" as const } : item,
            );
            setLiveFlashId(openTask.id);
          } else {
            const id = `live-event-${tick}`;
            const start = atHour(selectedDate, 11 + (tick % 6), 0);
            next = [
              ...next,
              {
                id,
                recordId: id,
                kind: "event",
                summary: titles[tick % titles.length]!,
                description: null,
                location: null,
                start: toIso(start),
                end: toIso(new Date(start.getTime() + 45 * 60 * 1000)),
                isAllDay: false,
                htmlLink: null,
                source: "local",
                customerName: null,
                timezone: timeZone,
              },
            ];
            setLiveFlashId(id);
          }
        } else {
          const id = `live-event-${tick}`;
          const start = atHour(selectedDate, 12 + (tick % 5), 15);
          next = [
            ...next,
            {
              id,
              recordId: id,
              kind: "event",
              summary: titles[(tick + 3) % titles.length]!,
              description: null,
              location: null,
              start: toIso(start),
              end: toIso(new Date(start.getTime() + 30 * 60 * 1000)),
              isAllDay: false,
              htmlLink: null,
              source: "local",
              customerName: null,
              timezone: timeZone,
            },
          ];
          setLiveFlashId(id);
        }

        if (next.length > 14) {
          next = next.slice(next.length - 14);
        }
        return { ...prev, [dayKey]: next };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [allEvents, createKind, dayKey, selectedDate, timeZone]);

  useEffect(() => {
    if (!liveFlashId) return;
    const timer = window.setTimeout(() => setLiveFlashId(null), 900);
    return () => window.clearTimeout(timer);
  }, [liveFlashId]);

  const dayLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: compact ? "short" : "long",
        month: "short",
        day: "numeric",
      }),
    [compact, selectedDate],
  );

  function ensureDaySeeded() {
    setEventsByDay((prev) => {
      if (prev[dayKey]) return prev;
      return { ...prev, [dayKey]: buildSeedEvents(selectedDate, allEvents) };
    });
  }

  function openCreate(kind: CreateKind, at?: Date) {
    ensureDaySeeded();
    setCreateKind(kind);
    setTitle(
      kind === "task"
        ? "Follow up with lead"
        : kind === "booking"
          ? "Consultation"
          : "Team sync",
    );
    setCustomer(event.customer);
    if (at) {
      setHour(String(at.getHours()).padStart(2, "0"));
      setMinute(String(Math.floor(at.getMinutes() / 15) * 15).padStart(2, "0"));
    } else {
      setHour("15");
      setMinute("30");
    }
  }

  function handleSlotClick(hourValue: number) {
    openCreate("booking", atHour(selectedDate, hourValue, 0));
  }

  function saveCreate() {
    if (!createKind || !title.trim()) return;
    const start = atHour(selectedDate, Number(hour) || 15, Number(minute) || 0);
    const duration = createKind === "task" ? 30 : 45;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const id = `demo-${createKind}-${Date.now()}`;

    const next: OrzuxCalendarEvent = {
      id,
      recordId: id,
      kind: createKind,
      summary: title.trim(),
      description: null,
      location: null,
      start: toIso(start),
      end: toIso(end),
      isAllDay: false,
      htmlLink: null,
      source: "local",
      isBooking: createKind === "booking",
      isTask: createKind === "task",
      taskStatus: createKind === "task" ? "open" : undefined,
      customerName: createKind === "booking" ? customer.trim() || event.customer : null,
      timezone: timeZone,
    };

    setEventsByDay((prev) => {
      const base = prev[dayKey] ?? buildSeedEvents(selectedDate, allEvents);
      return { ...prev, [dayKey]: [...base, next] };
    });
    setCreateKind(null);
  }

  function toggleTask(calendarEvent: OrzuxCalendarEvent) {
    if (!calendarEvent.isTask) return;
    setEventsByDay((prev) => {
      const base = prev[dayKey] ?? buildSeedEvents(selectedDate, allEvents);
      return {
        ...prev,
        [dayKey]: base.map((item) =>
          item.id === calendarEvent.id
            ? {
                ...item,
                taskStatus: item.taskStatus === "done" ? "open" : "done",
              }
            : item,
        ),
      };
    });
  }

  function eventStyle(calendarEvent: OrzuxCalendarEvent) {
    const start = new Date(calendarEvent.start);
    const end = new Date(calendarEvent.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = ((startMinutes - DAY_START * 60) / 60) * hourPx;
    const height = Math.max(((endMinutes - startMinutes) / 60) * hourPx, compact ? 34 : 40);
    return { top, height };
  }

  const createMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className={cn(
            "gap-1.5 rounded-full",
            compact ? "h-7 px-2.5 text-[11px]" : "h-8 px-3",
          )}
        >
          <PlusIcon className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
          {copy.liveDemo.addCalendarItem}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => openCreate("booking")}>
          <CalendarClockIcon className="mr-2 size-4" />
          {copy.liveDemo.addBooking}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openCreate("event")}>
          <CalendarCheckIcon className="mr-2 size-4" />
          {copy.liveDemo.addEvent}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openCreate("task")}>
          <CheckSquareIcon className="mr-2 size-4" />
          {copy.liveDemo.addTask}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100",
          compact ? "px-2 py-1.5" : "px-4 py-2.5",
        )}
      >
        <div className="min-w-0">
          {!compact ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {copy.liveDemo.calendar}
            </p>
          ) : null}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <div className="min-w-0 text-center">
              <p className={cn("truncate font-semibold text-zinc-900", compact ? "text-xs" : "text-sm")}>
                {dayLabel}
              </p>
              {!compact ? (
                <p className="text-[10px] text-zinc-400">{copy.liveDemo.calendarSync}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
            >
              <ChevronRightIcon className="size-4" />
            </button>
            {!sameDay(selectedDate, new Date()) ? (
              <button
                type="button"
                onClick={() => setSelectedDate(startOfDay(new Date()))}
                className="ml-0.5 rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
              >
                Today
              </button>
            ) : null}
          </div>
        </div>
        {createMenu}
      </div>

      <div
        ref={scrollRef}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-y-auto", compact ? "px-1.5 py-1.5" : "px-3 py-3")}
      >
        <div
          className="relative rounded-xl border border-zinc-200/80 bg-zinc-50/40"
          style={{ height: hours.length * hourPx }}
        >
          {hours.map((hourValue, index) => (
            <button
              key={hourValue}
              type="button"
              onClick={() => handleSlotClick(hourValue)}
              className="absolute inset-x-0 flex border-b border-zinc-200/70 text-left transition hover:bg-white/70"
              style={{ top: index * hourPx, height: hourPx }}
            >
              <span
                className={cn(
                  "shrink-0 px-1.5 pt-1 font-medium tabular-nums text-zinc-400",
                  compact ? "w-10 text-[9px]" : "w-12 text-[10px]",
                )}
              >
                {formatHour(hourValue)}
              </span>
              <span className="min-w-0 flex-1" />
            </button>
          ))}

          {events.map((calendarEvent) => {
            const style = eventStyle(calendarEvent);
            const done = calendarEvent.isTask && calendarEvent.taskStatus === "done";
            return (
              <button
                key={calendarEvent.id}
                type="button"
                onClick={() => toggleTask(calendarEvent)}
                className={cn(
                  "absolute left-[2.75rem] right-1.5 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition sm:left-14",
                  calendarEvent.isBooking && "border-emerald-500/35 bg-emerald-500/15",
                  calendarEvent.isTask &&
                    (done
                      ? "border-amber-500/25 bg-amber-500/5 opacity-70"
                      : "border-amber-500/40 bg-amber-500/15"),
                  !calendarEvent.isBooking &&
                    !calendarEvent.isTask &&
                    "border-violet-500/40 bg-violet-500/15",
                  compact && "left-11 right-1 px-1.5 py-0.5",
                  liveFlashId === calendarEvent.id &&
                    "scale-[1.02] ring-2 ring-[var(--landing-coral)]/70",
                )}
                style={{ top: style.top, height: style.height, zIndex: 2 }}
              >
                <p
                  className={cn(
                    "truncate font-semibold text-zinc-900",
                    compact ? "text-[10px] leading-3" : "text-[11px] leading-4",
                  )}
                >
                  {calendarEvent.summary}
                </p>
                <p className={cn("truncate text-zinc-600", compact ? "text-[9px]" : "text-[10px]")}>
                  {formatRange(calendarEvent.start, calendarEvent.end)}
                  {calendarEvent.customerName ? ` · ${calendarEvent.customerName}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={createKind !== null} onOpenChange={(open) => !open && setCreateKind(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createKind === "booking"
                ? copy.liveDemo.addBooking
                : createKind === "task"
                  ? copy.liveDemo.addTask
                  : copy.liveDemo.addEvent}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="demo-cal-title">{copy.liveDemo.calendarItemTitle}</Label>
              <Input
                id="demo-cal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {createKind === "booking" ? (
              <div className="space-y-1.5">
                <Label htmlFor="demo-cal-customer">{copy.liveDemo.summaryCustomer}</Label>
                <Input
                  id="demo-cal-customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="demo-cal-hour">{copy.liveDemo.calendarHour}</Label>
                <Input
                  id="demo-cal-hour"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-cal-minute">{copy.liveDemo.calendarMinute}</Label>
                <Input
                  id="demo-cal-minute"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateKind(null)}>
              {copy.liveDemo.cancel}
            </Button>
            <Button type="button" onClick={saveCreate}>
              {copy.liveDemo.saveCalendarItem}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
