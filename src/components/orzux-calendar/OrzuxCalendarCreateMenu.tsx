"use client";

import { CalendarClockIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";

type OrzuxCalendarCreateMenuProps = {
  variant: "sidebar" | "fab";
  onOpenBooking: () => void;
};

export function OrzuxCalendarCreateMenu({
  variant,
  onOpenBooking,
}: OrzuxCalendarCreateMenuProps) {
  if (variant === "fab") {
    return (
      <Button
        size="icon"
        className="size-14 rounded-2xl shadow-lg"
        aria-label={ORZUX_CALENDAR_MESSAGES.createBooking}
        onClick={onOpenBooking}
      >
        <PlusIcon className="size-6" />
      </Button>
    );
  }

  return (
    <Button
      className="w-full justify-start gap-2 rounded-full shadow-sm"
      onClick={onOpenBooking}
    >
      <CalendarClockIcon className="size-4" />
      {ORZUX_CALENDAR_MESSAGES.createBooking}
    </Button>
  );
}
