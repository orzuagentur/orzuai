import { DASHBOARD_ROUTES } from "@/constants/routes";

export const GOOGLE_CALENDAR_MESSAGES = {
  pageTitle: "Calendar",
  pageDescription: "View and manage events from your connected Google Calendar.",
  connectTitle: "Google Calendar",
  connectDescription:
    "Connect your Google account so AI can check availability and book appointments from chat.",
  connectButton: "Connect Google Calendar",
  reconnectButton: "Reconnect",
  connectedAs: "Connected as",
  calendarLabel: "Calendar",
  notConfiguredTitle: "Google OAuth not configured",
  notConfiguredDescription:
    "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment. In Google Cloud Console, add the redirect URI shown below.",
  redirectUriLabel: "Authorized redirect URI",
  noBusinessTitle: "Business profile required",
  noBusinessDescription:
    "Create your business profile before connecting Google Calendar.",
  disconnectSuccess: "Google Calendar disconnected.",
  oauthError: "Could not connect Google Calendar. Please try again.",
  oauthSuccess: "Google Calendar connected successfully.",
  emptyEvents: "No upcoming events in the next 60 days.",
  emptyEventsHint:
    "Create an event here or in Google Calendar — then click Refresh.",
  createEvent: "Create event",
  refresh: "Refresh",
  openGoogleCalendar: "Open Google Calendar",
  syncError: "Could not load events. Try Reconnect in settings.",
  eventCreated: "Event created.",
  eventCreateFailed: "Could not create event.",
  createEventTitle: "New event",
  eventTitleLabel: "Title",
  eventDateLabel: "Date",
  eventStartLabel: "Start",
  eventEndLabel: "End",
  backToIntegrations: "My integrations",
} as const;

export const GOOGLE_CALENDAR_INTEGRATION_HREF =
  `${DASHBOARD_ROUTES.integrations}/google_calendar`;

export const GOOGLE_CALENDAR_OAUTH_COOKIE = "google_calendar_oauth_state";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
