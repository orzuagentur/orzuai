"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClockIcon,
  CalendarIcon,
  CheckSquareIcon,
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AutoGrowDescriptionField } from "@/components/ui/AutoGrowDescriptionField";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";

import { startOfDay, toLocalDateTimeValue } from "./utils";

type OrzuxCalendarCreateMenuProps = {
  selectedDate: Date;
  variant: "sidebar" | "fab";
  bookingPageCount: number;
  onOpenBooking: () => void;
  eventOpen: boolean;
  onEventOpenChange: (open: boolean) => void;
  taskOpen: boolean;
  onTaskOpenChange: (open: boolean) => void;
  taskInitialStart?: Date | null;
  onPrepareTaskOpen?: () => void;
};

function defaultEndFromStart(startValue: string): string {
  const start = new Date(startValue);
  start.setHours(start.getHours() + 1);
  return toLocalDateTimeValue(start);
}

function dateKeyFromDateTimeValue(value: string): string {
  return value.slice(0, 10);
}

function endOfDayIsoFromDateKey(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59`).toISOString();
}

function defaultStartForDay(day: Date): string {
  const next = startOfDay(day);
  next.setHours(9, 0, 0, 0);
  if (isSameDayAsToday(day) && next < new Date()) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return toLocalDateTimeValue(now);
  }
  return toLocalDateTimeValue(next);
}

function defaultEndForDay(day: Date): string {
  const next = startOfDay(day);
  next.setHours(10, 0, 0, 0);
  if (isSameDayAsToday(day)) {
    const start = new Date(defaultStartForDay(day));
    start.setHours(start.getHours() + 1);
    return toLocalDateTimeValue(start);
  }
  return toLocalDateTimeValue(next);
}

function isSameDayAsToday(day: Date): boolean {
  return day.toDateString() === new Date().toDateString();
}

export function OrzuxCalendarCreateMenu({
  selectedDate,
  variant,
  bookingPageCount,
  onOpenBooking,
  eventOpen,
  onEventOpenChange,
  taskOpen,
  onTaskOpenChange,
  taskInitialStart = null,
  onPrepareTaskOpen,
}: OrzuxCalendarCreateMenuProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(() => defaultStartForDay(selectedDate));
  const [end, setEnd] = useState(() => defaultEndForDay(selectedDate));
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStart, setTaskStart] = useState(() => defaultStartForDay(selectedDate));
  const [taskEnd, setTaskEnd] = useState(() => defaultEndForDay(selectedDate));
  const [taskDue, setTaskDue] = useState(() =>
    dateKeyFromDateTimeValue(defaultStartForDay(selectedDate)),
  );

  useEffect(() => {
    if (eventOpen) {
      setTitle("");
      setDescription("");
      setStart(defaultStartForDay(selectedDate));
      setEnd(defaultEndForDay(selectedDate));
    }
  }, [eventOpen, selectedDate]);

  useEffect(() => {
    if (taskOpen) {
      setTaskTitle("");
      setTaskDescription("");

      if (taskInitialStart) {
        const startValue = toLocalDateTimeValue(taskInitialStart);
        setTaskStart(startValue);
        setTaskEnd(defaultEndFromStart(startValue));
        setTaskDue(dateKeyFromDateTimeValue(startValue));
      } else {
        const startValue = defaultStartForDay(selectedDate);
        setTaskStart(startValue);
        setTaskEnd(defaultEndForDay(selectedDate));
        setTaskDue(dateKeyFromDateTimeValue(startValue));
      }
    }
  }, [taskOpen, selectedDate, taskInitialStart]);

  async function handleCreateEvent() {
    if (!title.trim()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageTitleRequired);
      return;
    }

    setIsSaving(true);

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startDateTime: new Date(start).toISOString(),
          endDateTime: new Date(end).toISOString(),
          timeZone,
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.eventCreateFailed);
        return;
      }

      toast.success(ORZUX_CALENDAR_MESSAGES.eventCreated);
      onEventOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.eventCreateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageTitleRequired);
      return;
    }

    const start = new Date(taskStart);
    const end = new Date(taskEnd);

    if (end.getTime() <= start.getTime()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.taskInvalidTime);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/calendar/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          dueAt: endOfDayIsoFromDateKey(taskDue),
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.taskCreateFailed);
        return;
      }

      toast.success(ORZUX_CALENDAR_MESSAGES.taskCreated);
      onTaskOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.taskCreateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  const trigger =
    variant === "fab" ? (
      <Button
        size="icon"
        className="relative size-14 rounded-2xl shadow-lg"
        aria-label={ORZUX_CALENDAR_MESSAGES.create}
      >
        <PlusIcon className="size-6" />
        {bookingPageCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
            {bookingPageCount > 9 ? "9+" : bookingPageCount}
          </span>
        ) : null}
      </Button>
    ) : (
      <Button className="w-full justify-start gap-2 rounded-full shadow-sm">
        <PlusIcon className="size-4" />
        {ORZUX_CALENDAR_MESSAGES.create}
        {bookingPageCount > 0 ? (
          <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {bookingPageCount > 9 ? "9+" : bookingPageCount}
          </span>
        ) : null}
      </Button>
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align={variant === "fab" ? "end" : "start"} className="w-56">
          <DropdownMenuItem onClick={onOpenBooking}>
            <CalendarClockIcon className="size-4" />
            {ORZUX_CALENDAR_MESSAGES.createBooking}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEventOpenChange(true)}>
            <CalendarIcon className="size-4" />
            {ORZUX_CALENDAR_MESSAGES.createEvent}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onPrepareTaskOpen?.();
              onTaskOpenChange(true);
            }}
          >
            <CheckSquareIcon className="size-4" />
            {ORZUX_CALENDAR_MESSAGES.createTask}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={DASHBOARD_ROUTES.calendarBookingNew}>
              <FileTextIcon className="size-4" />
              {ORZUX_CALENDAR_MESSAGES.createBookingPage}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={eventOpen} onOpenChange={onEventOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ORZUX_CALENDAR_MESSAGES.newEvent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{ORZUX_CALENDAR_MESSAGES.eventHint}</p>
            <div className="space-y-2">
              <Label htmlFor="orzux-event-title">{ORZUX_CALENDAR_MESSAGES.eventTitle}</Label>
              <Input
                id="orzux-event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ORZUX_CALENDAR_MESSAGES.eventTitlePlaceholder}
              />
            </div>
            <AutoGrowDescriptionField
              id="orzux-event-description"
              label={ORZUX_CALENDAR_MESSAGES.eventDescription}
              value={description}
              onChange={setDescription}
            />
            <div className="space-y-2">
              <Label htmlFor="orzux-event-start">{ORZUX_CALENDAR_MESSAGES.eventStart}</Label>
              <Input
                id="orzux-event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orzux-event-end">{ORZUX_CALENDAR_MESSAGES.eventEnd}</Label>
              <Input
                id="orzux-event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEventOpenChange(false)}>
              {ORZUX_CALENDAR_MESSAGES.cancel}
            </Button>
            <Button disabled={isSaving} onClick={() => void handleCreateEvent()}>
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {ORZUX_CALENDAR_MESSAGES.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={onTaskOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ORZUX_CALENDAR_MESSAGES.newTask}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{ORZUX_CALENDAR_MESSAGES.taskHint}</p>
            <div className="space-y-2">
              <Label htmlFor="orzux-task-title">{ORZUX_CALENDAR_MESSAGES.taskTitle}</Label>
              <Input
                id="orzux-task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={ORZUX_CALENDAR_MESSAGES.taskTitlePlaceholder}
              />
            </div>
            <AutoGrowDescriptionField
              id="orzux-task-description"
              label={ORZUX_CALENDAR_MESSAGES.taskDescription}
              value={taskDescription}
              onChange={setTaskDescription}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orzux-task-start">{ORZUX_CALENDAR_MESSAGES.taskStart}</Label>
                <Input
                  id="orzux-task-start"
                  type="datetime-local"
                  value={taskStart}
                  onChange={(e) => {
                    setTaskStart(e.target.value);
                    if (dateKeyFromDateTimeValue(e.target.value) > taskDue) {
                      setTaskDue(dateKeyFromDateTimeValue(e.target.value));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orzux-task-end">{ORZUX_CALENDAR_MESSAGES.taskEnd}</Label>
                <Input
                  id="orzux-task-end"
                  type="datetime-local"
                  value={taskEnd}
                  onChange={(e) => setTaskEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orzux-task-due">{ORZUX_CALENDAR_MESSAGES.taskDueDate}</Label>
              <Input
                id="orzux-task-due"
                type="date"
                value={taskDue}
                min={dateKeyFromDateTimeValue(taskStart)}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onTaskOpenChange(false)}>
              {ORZUX_CALENDAR_MESSAGES.cancel}
            </Button>
            <Button disabled={isSaving} onClick={() => void handleCreateTask()}>
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {ORZUX_CALENDAR_MESSAGES.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
