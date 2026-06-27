import "server-only";

import type { TimeInterval } from "@/lib/calendar/slot-engine";
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
): Promise<{ events: GoogleCalendarEvent[]; error?: string }> {
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
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    return {
      events: [],
      error: body?.error?.message ?? `Calendar API error (${response.status})`,
    };
  }

  const data = (await response.json()) as GoogleEventsListResponse;

  return {
    events: (data.items ?? [])
      .map(mapGoogleEvent)
      .filter((event): event is GoogleCalendarEvent => event !== null),
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  input: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone: string;
  },
): Promise<{ success: boolean; event?: GoogleCalendarEvent; error?: string }> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startDateTime, timeZone: input.timeZone },
        end: { dateTime: input.endDateTime, timeZone: input.timeZone },
      }),
    },
  );

  const data = (await response.json()) as GoogleEventItem & {
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      success: false,
      error: data.error?.message ?? "Failed to create event.",
    };
  }

  const event = mapGoogleEvent(data);

  if (!event) {
    return { success: false, error: "Invalid event response." };
  }

  return { success: true, event };
}

type FreeBusyCalendarBlock = {
  start?: string;
  end?: string;
};

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: FreeBusyCalendarBlock[] }>;
  error?: { message?: string };
};

export async function queryGoogleCalendarFreeBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
): Promise<{ busy: TimeInterval[]; error?: string }> {
  if (calendarIds.length === 0) {
    return { busy: [] };
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: calendarIds.map((id) => ({ id })),
      }),
    },
  );

  const data = (await response.json()) as FreeBusyResponse;

  if (!response.ok) {
    return {
      busy: [],
      error: data.error?.message ?? `FreeBusy API error (${response.status})`,
    };
  }

  const busy: TimeInterval[] = [];

  for (const calendarId of calendarIds) {
    const blocks = data.calendars?.[calendarId]?.busy ?? [];

    for (const block of blocks) {
      if (!block.start || !block.end) {
        continue;
      }

      const start = new Date(block.start);
      const end = new Date(block.end);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        busy.push({ start, end });
      }
    }
  }

  busy.sort((a, b) => a.start.getTime() - b.start.getTime());

  return { busy };
}
