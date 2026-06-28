import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGoogleCalendarEvent } from "@/lib/google-calendar/client";
import {
  getGoogleCalendarAccessToken,
  getGoogleCalendarEventsForBusiness,
} from "@/services/google-calendar.service";
import type {
  CalendarEventRecord,
  CalendarTaskRecord,
  OrzuxCalendarEvent,
} from "@/types/calendar-events.types";
import type { GoogleCalendarEvent } from "@/types/google-calendar.types";

function mapEventRow(row: {
  id: string;
  business_id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  timezone: string;
  is_all_day: boolean;
  google_event_id: string | null;
  google_html_link: string | null;
  source: string;
  created_at: string;
  resource_id?: string | null;
  booking_page_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  is_booking?: boolean | null;
}): CalendarEventRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    isAllDay: row.is_all_day,
    googleEventId: row.google_event_id,
    googleHtmlLink: row.google_html_link,
    source: row.source,
    createdAt: row.created_at,
    resourceId: row.resource_id ?? null,
    bookingPageId: row.booking_page_id ?? null,
    customerName: row.customer_name ?? "",
    customerEmail: row.customer_email ?? "",
    isBooking: row.is_booking ?? false,
  };
}

function mapTaskRow(row: {
  id: string;
  business_id: string;
  title: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at: string | null;
  status: string;
  google_event_id: string | null;
  created_at: string;
}): CalendarTaskRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description ?? "",
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    dueAt: row.due_at,
    status: row.status as CalendarTaskRecord["status"],
    googleEventId: row.google_event_id,
    createdAt: row.created_at,
  };
}

export function toOrzuxCalendarEvent(
  record: CalendarEventRecord,
  resourceName?: string | null,
): OrzuxCalendarEvent {
  const fromGoogle = Boolean(record.googleEventId) || record.source === "google_sync";

  return {
    id: `local-event-${record.id}`,
    recordId: record.id,
    kind: record.isBooking ? "booking" : "event",
    summary: record.title,
    description: record.description || null,
    location: record.location || null,
    start: record.startAt,
    end: record.endAt,
    isAllDay: record.isAllDay,
    htmlLink: record.googleHtmlLink,
    source: fromGoogle ? "google" : "local",
    isBooking: record.isBooking,
    resourceId: record.resourceId,
    resourceName: resourceName ?? null,
    customerName: record.customerName || null,
    customerEmail: record.customerEmail || null,
    timezone: record.timezone,
  };
}

export function taskToOrzuxCalendarEvent(task: CalendarTaskRecord): OrzuxCalendarEvent {
  const fallbackDue = task.dueAt ? new Date(task.dueAt) : new Date();
  const start = task.startAt ? new Date(task.startAt) : new Date(fallbackDue);
  if (!task.startAt) {
    start.setHours(9, 0, 0, 0);
  }

  const end = task.endAt
    ? new Date(task.endAt)
    : new Date(start.getTime() + 30 * 60 * 1000);

  return {
    id: `local-task-${task.id}`,
    recordId: task.id,
    kind: "task",
    summary: task.title,
    description: task.description || null,
    location: null,
    start: start.toISOString(),
    end: end.toISOString(),
    isAllDay: false,
    htmlLink: null,
    source: "local",
    isTask: true,
    dueAt: task.dueAt,
  };
}

export function googleEventToOrzux(event: GoogleCalendarEvent): OrzuxCalendarEvent {
  return {
    id: `google-${event.id}`,
    recordId: event.id,
    kind: "event",
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    isAllDay: event.isAllDay,
    htmlLink: event.htmlLink,
    source: "google",
  };
}

function parseGoogleEventDateTimes(event: GoogleCalendarEvent): {
  startAt: string;
  endAt: string;
  isAllDay: boolean;
} {
  if (event.isAllDay) {
    const startAt = new Date(`${event.start}T00:00:00.000Z`).toISOString();
    const endAt = new Date(`${event.end}T00:00:00.000Z`).toISOString();
    return { startAt, endAt, isAllDay: true };
  }

  return {
    startAt: new Date(event.start).toISOString(),
    endAt: new Date(event.end).toISOString(),
    isAllDay: false,
  };
}

export async function syncGoogleCalendarEventsForBusiness(
  businessId: string,
): Promise<{ synced: number; syncError?: string }> {
  const result = await getGoogleCalendarEventsForBusiness(businessId);

  if (!result) {
    return { synced: 0 };
  }

  if (result.syncError) {
    return { synced: 0, syncError: result.syncError };
  }

  const admin = createAdminClient();
  let synced = 0;

  for (const event of result.events) {
    const { startAt, endAt, isAllDay } = parseGoogleEventDateTimes(event);

    const { data: existing } = await admin
      .from("calendar_events")
      .select("id, source")
      .eq("business_id", businessId)
      .eq("google_event_id", event.id)
      .maybeSingle();

    const payload = {
      title: event.summary,
      description: event.description ?? "",
      location: event.location ?? "",
      start_at: startAt,
      end_at: endAt,
      is_all_day: isAllDay,
      google_html_link: event.htmlLink,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await admin
        .from("calendar_events")
        .update(payload)
        .eq("id", existing.id);

      if (!error) {
        synced += 1;
      }
      continue;
    }

    const { error } = await admin.from("calendar_events").insert({
      business_id: businessId,
      ...payload,
      timezone: "UTC",
      google_event_id: event.id,
      source: "google_sync",
    });

    if (!error) {
      synced += 1;
    }
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { synced, syncError: result.syncError };
}

export function mergeCalendarEvents(input: {
  localEvents: CalendarEventRecord[];
  localTasks: CalendarTaskRecord[];
  googleEvents: GoogleCalendarEvent[];
}): OrzuxCalendarEvent[] {
  const linkedGoogleIds = new Set(
    input.localEvents
      .map((event) => event.googleEventId)
      .filter((id): id is string => Boolean(id)),
  );

  const merged: OrzuxCalendarEvent[] = [
    ...input.localEvents.map((record) => toOrzuxCalendarEvent(record)),
    ...input.localTasks.map(taskToOrzuxCalendarEvent),
    ...input.googleEvents
      .filter((event) => !linkedGoogleIds.has(event.id))
      .map(googleEventToOrzux),
  ];

  return merged.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

export async function listCalendarEventsForBusiness(
  businessId: string,
): Promise<CalendarEventRecord[]> {
  const admin = createAdminClient();
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);

  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("business_id", businessId)
    .gte("start_at", timeMin.toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapEventRow);
}

export async function listCalendarBookingsForBusiness(
  businessId: string,
): Promise<CalendarEventRecord[]> {
  const admin = createAdminClient();
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);

  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_booking", true)
    .gte("start_at", timeMin.toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapEventRow);
}

export async function listCalendarTasksForBusiness(
  businessId: string,
): Promise<CalendarTaskRecord[]> {
  const admin = createAdminClient();
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);

  const { data, error } = await admin
    .from("calendar_tasks")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "open")
    .or(`start_at.gte.${timeMin.toISOString()},due_at.gte.${timeMin.toISOString()}`)
    .order("start_at", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTaskRow);
}

async function syncEventToGoogle(input: {
  businessId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
}): Promise<{ googleEventId: string | null; htmlLink: string | null }> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    !connection ||
    connection.google_calendar_status !== "connected" ||
    !connection.calendar_id
  ) {
    return { googleEventId: null, htmlLink: null };
  }

  const accessToken = await getGoogleCalendarAccessToken(connection);

  if (!accessToken) {
    return { googleEventId: null, htmlLink: null };
  }

  const created = await createGoogleCalendarEvent(
    accessToken,
    connection.calendar_id,
    {
      summary: input.title,
      description: input.description || undefined,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      timeZone: input.timeZone,
    },
  );

  if (!created.success || !created.event) {
    return { googleEventId: null, htmlLink: null };
  }

  return {
    googleEventId: created.event.id,
    htmlLink: created.event.htmlLink ?? null,
  };
}

export async function createCalendarEventForBusiness(input: {
  businessId: string;
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  syncToGoogle?: boolean;
  resourceId?: string | null;
  bookingPageId?: string | null;
  customerName?: string;
  customerEmail?: string;
  isBooking?: boolean;
}): Promise<{ success: boolean; message?: string; eventId?: string }> {
  const admin = createAdminClient();

  let googleEventId: string | null = null;
  let googleHtmlLink: string | null = null;

  if (input.syncToGoogle !== false) {
    const synced = await syncEventToGoogle({
      businessId: input.businessId,
      title: input.title,
      description: input.description ?? "",
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      timeZone: input.timeZone,
    });
    googleEventId = synced.googleEventId;
    googleHtmlLink = synced.htmlLink;
  }

  const { data, error } = await admin.from("calendar_events").insert({
    business_id: input.businessId,
    title: input.title,
    description: input.description ?? "",
    location: input.location ?? "",
    start_at: input.startDateTime,
    end_at: input.endDateTime,
    timezone: input.timeZone,
    is_all_day: false,
    google_event_id: googleEventId,
    google_html_link: googleHtmlLink,
    source: googleEventId ? "manual_google" : input.isBooking ? "booking" : "manual",
    resource_id: input.resourceId ?? null,
    booking_page_id: input.bookingPageId ?? null,
    customer_name: input.customerName ?? "",
    customer_email: input.customerEmail ?? "",
    is_booking: input.isBooking ?? false,
  }).select("id").single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { success: true, eventId: data?.id };
}

export async function updateCalendarEventForBusiness(input: {
  businessId: string;
  eventId: string;
  title?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  resourceId?: string | null;
}): Promise<{ success: boolean; message?: string; event?: CalendarEventRecord }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_events")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("id", input.eventId)
    .maybeSingle();

  if (!existing) {
    return { success: false, message: "Event not found." };
  }

  const payload = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    location: input.location ?? existing.location,
    start_at: input.startDateTime ?? existing.start_at,
    end_at: input.endDateTime ?? existing.end_at,
    timezone: input.timeZone ?? existing.timezone,
    resource_id: input.resourceId === undefined ? existing.resource_id : input.resourceId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("calendar_events")
    .update(payload)
    .eq("business_id", input.businessId)
    .eq("id", input.eventId)
    .select("*")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { success: true, event: mapEventRow(data) };
}

export async function deleteCalendarEventForBusiness(input: {
  businessId: string;
  eventId: string;
}): Promise<{ success: boolean; message?: string; event?: CalendarEventRecord }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_events")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("id", input.eventId)
    .maybeSingle();

  if (!existing) {
    return { success: false, message: "Event not found." };
  }

  const { error } = await admin
    .from("calendar_events")
    .delete()
    .eq("business_id", input.businessId)
    .eq("id", input.eventId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { success: true, event: mapEventRow(existing) };
}

export async function getCalendarEventForBusiness(
  businessId: string,
  eventId: string,
): Promise<CalendarEventRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_events")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", eventId)
    .maybeSingle();

  return data ? mapEventRow(data) : null;
}

export async function createCalendarTaskForBusiness(input: {
  businessId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  dueAt: string;
  syncToGoogle?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const admin = createAdminClient();
  const start = new Date(input.startDateTime);
  const end = new Date(input.endDateTime);
  const due = new Date(input.dueAt);

  if (end.getTime() <= start.getTime()) {
    return { success: false, message: "End time must be after start time." };
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const description = input.description?.trim() ?? "";

  let googleEventId: string | null = null;

  if (input.syncToGoogle !== false) {
    const synced = await syncEventToGoogle({
      businessId: input.businessId,
      title: `✓ ${input.title}`,
      description,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      timeZone,
    });
    googleEventId = synced.googleEventId;
  }

  const { error } = await admin.from("calendar_tasks").insert({
    business_id: input.businessId,
    title: input.title,
    description,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    due_at: due.toISOString(),
    status: "open",
    google_event_id: googleEventId,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { success: true };
}

export async function completeCalendarTaskForBusiness(input: {
  businessId: string;
  taskId: string;
}): Promise<{ success: boolean; message?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("calendar_tasks")
    .update({ status: "done" })
    .eq("business_id", input.businessId)
    .eq("id", input.taskId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  if (!data) {
    return { success: false, message: "Task not found or already completed." };
  }

  revalidatePath(DASHBOARD_ROUTES.calendar);
  return { success: true };
}
