import { DASHBOARD_ROUTES } from "@/constants/routes";

export const GOOGLE_CALENDAR_MESSAGES = {
  pageTitle: "Calendar",
  pageDescription:
    "Your OrzuX schedule for bookings, events, and tasks. Connect Google Calendar optionally to sync external events.",
  connectTitle: "Connect Google Calendar",
  connectDescription:
    "Link the calendar you already use. OrzuAI reads your real availability and can book appointments from customer chats.",
  connectButton: "Connect Google Calendar",
  reconnectButton: "Reconnect",
  connectedAs: "Connected as",
  calendarLabel: "Primary calendar",
  scheduleTitle: "Upcoming",
  todayLabel: "Today",
  tomorrowLabel: "Tomorrow",
  todayBadge: "Today",
  allDayLabel: "All day",
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
  emptyEvents: "Nothing scheduled ahead",
  emptyEventsHint:
    "Add events in Google Calendar or use New event above.",
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
  availabilityTitle: "Open times",
  availabilityDescription:
    "Free slots from your Google Calendar. The AI assistant can offer these when customers ask to book.",
  availabilityEmpty:
    "No free slots in the next two weeks. Check business hours below or free up time in Google Calendar.",
  settingsTitle: "Booking hours",
  settingsDescription:
    "Timezone and working hours used when checking availability.",
  settingsSave: "Save booking rules",
  settingsSaved: "Booking rules saved.",
  settingsSaveFailed: "Could not save booking rules.",
  timezoneLabel: "Timezone",
  bufferLabel: "Buffer between bookings (minutes)",
  advanceDaysLabel: "Book up to (days ahead)",
  hoursEnabledLabel: "Only book during business hours",
  hoursEnabledHint: "When on, AI only books inside the hours below.",
  hoursStartLabel: "Opens at",
  hoursEndLabel: "Closes at",
} as const;

export const GOOGLE_CALENDAR_INTEGRATION_HREF =
  `${DASHBOARD_ROUTES.integrations}/google_calendar`;

export const GOOGLE_CALENDAR_OAUTH_COOKIE = "google_calendar_oauth_state";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
