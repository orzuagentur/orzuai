"use client";

import { CalendarClockIcon, CalendarIcon, CheckSquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";

type OrzuxCalendarSlotSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotTime: Date | null;
  onCreateBooking: () => void;
  onCreateEvent: () => void;
  onCreateTask: () => void;
};

export function OrzuxCalendarSlotSheet({
  open,
  onOpenChange,
  slotTime,
  onCreateBooking,
  onCreateEvent,
  onCreateTask,
}: OrzuxCalendarSlotSheetProps) {
  const label = slotTime
    ? slotTime.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{ORZUX_CALENDAR_MESSAGES.createAtTime}</SheetTitle>
          {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
        </SheetHeader>

        <div className="mt-4 grid gap-2 pb-4">
          <Button
            className="h-12 justify-start gap-3"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onCreateBooking();
            }}
          >
            <CalendarClockIcon className="size-5 text-primary" />
            {ORZUX_CALENDAR_MESSAGES.createBooking}
          </Button>
          <Button
            className="h-12 justify-start gap-3"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onCreateEvent();
            }}
          >
            <CalendarIcon className="size-5" />
            {ORZUX_CALENDAR_MESSAGES.createEvent}
          </Button>
          <Button
            className="h-12 justify-start gap-3"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onCreateTask();
            }}
          >
            <CheckSquareIcon className="size-5" />
            {ORZUX_CALENDAR_MESSAGES.createTask}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
