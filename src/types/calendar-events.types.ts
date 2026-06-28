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
  resourceId: string | null;
  bookingPageId: string | null;
  customerName: string;
  customerEmail: string;
  isBooking: boolean;
};

export type CalendarTaskRecord = {
  id: string;
  businessId: string;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  dueAt: string | null;
  status: "open" | "done";
  googleEventId: string | null;
  createdAt: string;
};

export type OrzuxCalendarEventKind = "event" | "task" | "booking";

export type OrzuxCalendarEvent = {
  id: string;
  recordId: string;
  kind: OrzuxCalendarEventKind;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
  source: "local" | "google";
  isTask?: boolean;
  taskStatus?: "open" | "done";
  isBooking?: boolean;
  resourceId?: string | null;
  resourceName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  timezone?: string;
  dueAt?: string | null;
};
