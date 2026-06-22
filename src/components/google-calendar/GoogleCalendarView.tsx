import Link from "next/link";
import { CalendarIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react";

import { GoogleCalendarToolbar } from "@/components/google-calendar/GoogleCalendarToolbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import type { GoogleCalendarEvent } from "@/types/google-calendar.types";

type GoogleCalendarViewProps = {
  events: GoogleCalendarEvent[];
  calendarSummary: string | null;
  googleAccountEmail: string | null;
  syncError?: string | null;
};

function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.isAllDay) {
    return "All day";
  }

  const start = new Date(event.start);
  const end = new Date(event.end);

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }

  return `${dateFormatter.format(start)} ${timeFormatter.format(start)} – ${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
}

function groupEventsByDay(events: GoogleCalendarEvent[]): Map<string, GoogleCalendarEvent[]> {
  const groups = new Map<string, GoogleCalendarEvent[]>();

  for (const event of events) {
    const dayKey = event.isAllDay
      ? event.start
      : new Date(event.start).toDateString();

    const existing = groups.get(dayKey) ?? [];
    existing.push(event);
    groups.set(dayKey, existing);
  }

  return groups;
}

export function GoogleCalendarView({
  events,
  calendarSummary,
  googleAccountEmail,
  syncError,
}: GoogleCalendarViewProps) {
  const grouped = groupEventsByDay(events);

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 bg-background p-4 text-foreground md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Google Calendar</p>
          {calendarSummary ? (
            <p className="text-sm text-muted-foreground">
              {calendarSummary}
              {googleAccountEmail ? ` · ${googleAccountEmail}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GoogleCalendarToolbar />
          <Button variant="outline" size="sm" asChild>
            <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF}>Settings</Link>
          </Button>
        </div>
      </div>

      {syncError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="p-4 text-sm text-destructive">
            {syncError}. Reconnect in{" "}
            <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF} className="underline">
              Calendar settings
            </Link>
            .
          </CardContent>
        </Card>
      ) : null}

      {events.length === 0 ? (
        <Card className="max-w-2xl border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <CalendarIcon className="size-4" />
              No events
            </CardTitle>
            <CardDescription>
              No events in the next 60 days (or past week). Use Create event above,
              or add events in Google Calendar and click Refresh.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([dayKey, dayEvents]) => {
            const dayLabel = dayEvents[0]?.isAllDay
              ? new Date(dayKey + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : new Date(dayKey).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                });

            return (
              <section key={dayKey} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {dayLabel}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <Card key={event.id} className="border bg-card shadow-none">
                      <CardContent className="flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-foreground">{event.summary}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatEventTime(event)}
                          </p>
                          {event.location ? (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPinIcon className="size-3.5 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </p>
                          ) : null}
                        </div>
                        {event.htmlLink ? (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open in Google Calendar"
                            >
                              <ExternalLinkIcon className="size-4" />
                            </a>
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
