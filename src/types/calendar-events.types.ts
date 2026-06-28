export type CalendarEventRecord = {
  id: string;
  businessId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  timezone: string;
  isAllDay: boolean;
  googleEventId: string | null;
  googleHtmlLink: string | null;
  source: string;
  createdAt: string;
};

export type CalendarTaskRecord = {
  id: string;
  businessId: string;
  title: string;
  dueAt: string | null;
  status: "open" | "done";
  googleEventId: string | null;
  createdAt: string;
};

export type OrzuxCalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
  source: "local" | "google";
  isTask?: boolean;
};
