import { ClockIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";

type Slot = {
  label: string;
  start: string;
  end: string;
};

type CalendarAvailabilityPanelProps = {
  slots: Slot[];
  timeZone: string;
};

function groupSlotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>();

  for (const slot of slots) {
    const dayKey = new Date(slot.start).toDateString();
    const list = groups.get(dayKey) ?? [];
    list.push(slot);
    groups.set(dayKey, list);
  }

  return groups;
}

function formatDayHeading(isoStart: string): string {
  const date = new Date(isoStart);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return GOOGLE_CALENDAR_MESSAGES.todayLabel;
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return GOOGLE_CALENDAR_MESSAGES.tomorrowLabel;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSlotTime(isoStart: string, isoEnd: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(isoStart))} – ${formatter.format(new Date(isoEnd))}`;
}

export function CalendarAvailabilityPanel({
  slots,
  timeZone,
}: CalendarAvailabilityPanelProps) {
  const grouped = groupSlotsByDay(slots);

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ClockIcon className="size-4 text-muted-foreground" />
          {GOOGLE_CALENDAR_MESSAGES.availabilityTitle}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {GOOGLE_CALENDAR_MESSAGES.availabilityDescription}
          <span className="mt-1 block text-muted-foreground/80">{timeZone}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {GOOGLE_CALENDAR_MESSAGES.availabilityEmpty}
          </p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([dayKey, daySlots]) => (
              <div key={dayKey}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {formatDayHeading(daySlots[0]!.start)}
                </p>
                <ul className="space-y-1">
                  {daySlots.map((slot) => (
                    <li
                      key={slot.start}
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {formatSlotTime(slot.start, slot.end)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
