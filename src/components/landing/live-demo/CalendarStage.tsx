"use client";

import {
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  PlusIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { OrzuxCalendarDayGrid } from "@/components/orzux-calendar/OrzuxCalendarDayGrid";
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
import type { LandingLiveEvent } from "@/features/landing/demo";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

type CalendarStageProps = {
  event: LandingLiveEvent;
  allEvents: LandingLiveEvent[];
};

type CreateKind = "booking" | "event" | "task";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function atHour(day: Date, hour: number, minute = 0): Date {
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function buildSeedEvents(
  day: Date,
  allEvents: LandingLiveEvent[],
): OrzuxCalendarEvent[] {
  const seeded: OrzuxCalendarEvent[] = [];

  for (const item of allEvents) {
    for (const booking of item.bookings ?? []) {
      if (booking.status === "busy") continue;
      const [hours, minutes] = booking.time.split(":").map(Number);
      const start = atHour(day, hours ?? 10, minutes ?? 0);
      const end = new Date(start.getTime() + 45 * 60 * 1000);
      seeded.push({
        id: booking.id,
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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }

  const taskStart = atHour(day, 14, 0);
  seeded.push({
    id: "demo-task-followup",
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
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return seeded;
}

export function CalendarStage({ event, allEvents }: CalendarStageProps) {
  const { copy } = useLandingLocale();
  const selectedDate = useMemo(() => startOfToday(), []);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [events, setEvents] = useState<OrzuxCalendarEvent[]>(() =>
    buildSeedEvents(selectedDate, allEvents),
  );
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [hour, setHour] = useState("15");
  const [minute, setMinute] = useState("30");

  function openCreate(kind: CreateKind) {
    setCreateKind(kind);
    setTitle(
      kind === "task"
        ? "Follow up with lead"
        : kind === "booking"
          ? "Consultation"
          : "Team sync",
    );
    setCustomer(event.customer);
    setHour("15");
    setMinute("30");
  }

  function handleSlotClick(time: Date) {
    setCreateKind("booking");
    setTitle("Consultation");
    setCustomer(event.customer);
    setHour(String(time.getHours()).padStart(2, "0"));
    setMinute(String(Math.floor(time.getMinutes() / 15) * 15).padStart(2, "0"));
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

    setEvents((prev) => [...prev, next]);
    setCreateKind(null);
  }

  function handleTaskStatusChange(
    calendarEvent: OrzuxCalendarEvent,
    status: "open" | "done",
  ) {
    setEvents((prev) =>
      prev.map((item) =>
        item.id === calendarEvent.id ? { ...item, taskStatus: status } : item,
      ),
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {copy.liveDemo.calendar}
          </p>
          <h2 className="text-sm font-semibold text-zinc-900">
            {copy.liveDemo.calendarTitle}
          </h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" className="h-8 gap-1.5 rounded-full px-3">
              <PlusIcon className="size-3.5" aria-hidden="true" />
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
      </div>

      <div className="min-h-0 flex-1 p-3">
        <OrzuxCalendarDayGrid
          selectedDate={selectedDate}
          events={events}
          timeZone={timeZone}
          onSlotClick={handleSlotClick}
          onTaskStatusChange={handleTaskStatusChange}
        />
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
