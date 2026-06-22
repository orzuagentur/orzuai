import "server-only";

import type { GoogleCalendarEvent } from "@/types/google-calendar.types";

type GoogleCalendarListItem = {
  id?: string;
  summary?: string;
  primary?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
};

type GoogleEventDateTime = {
  dateTime?: string;
  date?: string;
};

type GoogleEventItem = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
};

type GoogleEventsListResponse = {
  items?: GoogleEventItem[];
};

export async function fetchPrimaryGoogleCalendar(
  accessToken: string,
): Promise<{ id: string; summary: string } | null> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GoogleCalendarListResponse;
  const calendars = data.items ?? [];
  const primary =
    calendars.find((item) => item.primary && item.id) ??
    calendars.find((item) => item.id);

  if (!primary?.id) {
    return null;
  }

  return {
    id: primary.id,
    summary: primary.summary ?? "Primary calendar",
  };
}

function mapGoogleEvent(item: GoogleEventItem): GoogleCalendarEvent | null {
  if (!item.id) {
    return null;
  }

  const startRaw = item.start?.dateTime ?? item.start?.date;
  const endRaw = item.end?.dateTime ?? item.end?.date;

  if (!startRaw || !endRaw) {
    return null;
  }

  return {
    id: item.id,
    summary: item.summary ?? "(No title)",
    description: item.description ?? null,
    location: item.location ?? null,
    start: startRaw,
    end: endRaw,
    isAllDay: Boolean(item.start?.date && !item.start?.dateTime),
    htmlLink: item.htmlLink ?? null,
  };
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as GoogleEventsListResponse;

  return (data.items ?? [])
    .map(mapGoogleEvent)
    .filter((event): event is GoogleCalendarEvent => event !== null);
}
