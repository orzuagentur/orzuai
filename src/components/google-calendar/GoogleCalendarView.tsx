import Link from "next/link";
import { CalendarIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react";

import { GoogleCalendarToolbar } from "@/components/google-calendar/GoogleCalendarToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GOOGLE_CALENDAR_INTEGRATION_HREF, GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import type { GoogleCalendarEvent } from "@/types/google-calendar.types";

type GoogleCalendarViewProps = {
  events: GoogleCalendarEvent[];
  syncError?: string | null;
};

function formatEventTimeRange(event: GoogleCalendarEvent): string {
  if (event.isAllDay) {
    return GOOGLE_CALENDAR_MESSAGES.allDayLabel;
  }

  const start = new Date(event.start);
  const end = new Date(event.end);
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (start.toDateString() === end.toDateString()) {
    return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }

  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

function groupEventsByDay(events: GoogleCalendarEvent[]): Map<string, GoogleCalendarEvent[]> {
  const groups = new Map<string, GoogleCalendarEvent[]>();
  const today = new Date().toDateString();

  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (const event of sorted) {
    const dayKey = event.isAllDay
      ? event.start
      : new Date(event.start).toDateString();

    if (!event.isAllDay && dayKey < today) {
      continue;
    }

    const existing = groups.get(dayKey) ?? [];
    existing.push(event);
    groups.set(dayKey, existing);
  }

  return groups;
}

function formatDayLabel(dayKey: string, isAllDayAnchor: boolean): string {
  const date = isAllDayAnchor
    ? new Date(dayKey + "T12:00:00")
    : new Date(dayKey);

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
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function GoogleCalendarView({
  events,
  syncError,
}: GoogleCalendarViewProps) {
  const grouped = groupEventsByDay(events);
  const dayEntries = [...grouped.entries()];

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {GOOGLE_CALENDAR_MESSAGES.scheduleTitle}
        </h2>
        <GoogleCalendarToolbar />
      </div>

      {syncError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {syncError}.{" "}
          <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF} className="underline">
            {GOOGLE_CALENDAR_MESSAGES.reconnectButton}
          </Link>
        </div>
      ) : null}

      {dayEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <CalendarIcon className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="font-medium">{GOOGLE_CALENDAR_MESSAGES.emptyEvents}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {GOOGLE_CALENDAR_MESSAGES.emptyEventsHint}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayEntries.map(([dayKey, dayEvents]) => {
            const isToday =
              formatDayLabel(dayKey, Boolean(dayEvents[0]?.isAllDay)) ===
              GOOGLE_CALENDAR_MESSAGES.todayLabel;

            return (
              <div key={dayKey}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {formatDayLabel(dayKey, Boolean(dayEvents[0]?.isAllDay))}
                  </h3>
                  {isToday ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {GOOGLE_CALENDAR_MESSAGES.todayBadge}
                    </Badge>
                  ) : null}
                </div>
                <ul className="divide-y rounded-xl border bg-card">
                  {dayEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start gap-4 px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="w-28 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">
                        {formatEventTimeRange(event)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium leading-snug">{event.summary}</p>
                        {event.location ? (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPinIcon className="size-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </p>
                        ) : null}
                      </div>
                      {event.htmlLink ? (
                        <Button variant="ghost" size="icon" className="shrink-0" asChild>
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={GOOGLE_CALENDAR_MESSAGES.openGoogleCalendar}
                          >
                            <ExternalLinkIcon className="size-4" />
                          </a>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
