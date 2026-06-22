import type { GoogleCalendarStatus } from "./database.types";

export type GoogleCalendarConnectionData = {
  id: string;
  businessId: string;
  status: GoogleCalendarStatus;
  googleAccountEmail: string | null;
  calendarId: string | null;
  calendarSummary: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type GoogleCalendarConnectConfig = {
  isConfigured: boolean;
  redirectUri: string;
  connectUrl: string;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
};

export type GoogleCalendarEventsResult = {
  events: GoogleCalendarEvent[];
  timeMin: string;
  timeMax: string;
};
