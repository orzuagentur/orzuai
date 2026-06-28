import "server-only";

import {
  findAvailableSlots,
  findNearestAvailableSlot,
  formatDateKeyInTimezone,
  formatSlotForDisplay,
  getTimezoneDayBounds,
  isIntervalFree,
  isWithinOperatingHours,
  mergeBusyIntervals,
  parseIsoDateTime,
  type OperatingHoursConfig,
  type TimeInterval,
} from "@/lib/calendar/slot-engine";
import {
  listGoogleCalendarEvents,
  queryGoogleCalendarFreeBusy,
} from "@/lib/google-calendar/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getBusinessBookingSetup,
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";
import {
  getBookingPageByIdAdmin,
  getPublishedBookingPageBySlug,
} from "@/services/booking-pages.service";
import { listPublicBookingPageResources } from "@/services/business-calendar-resources.service";
import type { BookingPageRecord } from "@/types/booking-page.types";
import type { BusinessBookingSetup, BusinessCalendarResource } from "@/types/business-calendar-resource.types";
import type { GoogleCalendarConnection } from "@/types/database.types";

async function loadGoogleCalendarConnection(
  businessId: string,
): Promise<GoogleCalendarConnection | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || data.google_calendar_status !== "connected" || !data.calendar_id) {
    return null;
  }

  return data;
}

async function resolveAccessToken(
  connection: GoogleCalendarConnection,
): Promise<string | null> {
  const { getGoogleCalendarAccessToken } = await import(
    "@/services/google-calendar.service"
  );

  return getGoogleCalendarAccessToken(connection);
}

function buildOperatingHoursFromSetup(
  setup: BusinessBookingSetup | null,
): OperatingHoursConfig {
  const schedule = setup?.weeklySchedule;
  const daySchedules: Record<number, { start: string; end: string }> = {};

  if (schedule) {
    for (const [dayKey, day] of Object.entries(schedule)) {
      if (day.enabled) {
        daySchedules[Number(dayKey)] = { start: day.start, end: day.end };
      }
    }
  }

  return {
    enabled: setup?.businessHoursEnabled ?? false,
    start: setup?.businessHoursStart ?? "09:00",
    end: setup?.businessHoursEnd ?? "18:00",
    timezone: setup?.bookingTimezone ?? "UTC",
    days: setup?.businessDays ?? [1, 2, 3, 4, 5],
    daySchedules: Object.keys(daySchedules).length > 0 ? daySchedules : undefined,
  };
}

function buildOperatingHoursFromBookingPage(
  page: BookingPageRecord,
): OperatingHoursConfig {
  const daySchedules: Record<number, { start: string; end: string }> = {};
  const enabledDays: number[] = [];

  for (const [dayKey, day] of Object.entries(page.weeklySchedule)) {
    if (day.enabled) {
      const dayNumber = Number(dayKey);
      daySchedules[dayNumber] = { start: day.start, end: day.end };
      enabledDays.push(dayNumber);
    }
  }

  return {
    enabled: enabledDays.length > 0,
    start: "09:00",
    end: "18:00",
    timezone: page.bookingTimezone,
    days: enabledDays,
    daySchedules,
  };
}

function matchResourceByName(
  resources: BusinessCalendarResource[],
  resourceName?: string | null,
): BusinessCalendarResource | null {
  if (!resourceName?.trim()) {
    return resources[0] ?? null;
  }

  const normalized = resourceName.trim().toLowerCase();

  return (
    resources.find((resource) => resource.name.toLowerCase() === normalized) ??
    resources.find((resource) =>
      normalized.includes(resource.name.toLowerCase()),
    ) ??
    resources.find((resource) =>
      resource.name.toLowerCase().includes(normalized),
    ) ??
    null
  );
}

async function getLocalBusyIntervals(input: {
  businessId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<TimeInterval[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("calendar_events")
    .select("start_at, end_at, is_all_day")
    .eq("business_id", input.businessId)
    .gte("start_at", input.timeMin.toISOString())
    .lte("start_at", input.timeMax.toISOString());

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const start = new Date(row.start_at);
      const end = new Date(row.end_at);

      if (row.is_all_day) {
        end.setHours(23, 59, 59, 999);
      }

      return { start, end };
    })
    .filter(
      (interval) =>
        !Number.isNaN(interval.start.getTime()) &&
        !Number.isNaN(interval.end.getTime()),
    );
}

function matchResourceFromSummary(
  resources: BusinessCalendarResource[],
  summary: string,
): BusinessCalendarResource | null {
  const normalizedSummary = summary.toLowerCase();

  for (const resource of resources) {
    if (normalizedSummary.includes(resource.name.toLowerCase())) {
      return resource;
    }
  }

  return resources[0] ?? null;
}

export async function getCalendarBusyIntervals(input: {
  businessId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<TimeInterval[]> {
  const [localBusy, googleBusy] = await Promise.all([
    getLocalBusyIntervals(input),
    getGoogleCalendarBusyIntervals(input),
  ]);

  return mergeBusyIntervals([...localBusy, ...googleBusy]);
}

async function getGoogleCalendarBusyIntervals(input: {
  businessId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<TimeInterval[]> {
  const connection = await loadGoogleCalendarConnection(input.businessId);

  if (!connection?.calendar_id) {
    return [];
  }

  const accessToken = await resolveAccessToken(connection);

  if (!accessToken) {
    return [];
  }

  const timeMin = input.timeMin.toISOString();
  const timeMax = input.timeMax.toISOString();

  const freeBusy = await queryGoogleCalendarFreeBusy(
    accessToken,
    [connection.calendar_id],
    timeMin,
    timeMax,
  );

  if (freeBusy.busy.length > 0) {
    return freeBusy.busy;
  }

  const listed = await listGoogleCalendarEvents(
    accessToken,
    connection.calendar_id,
    timeMin,
    timeMax,
  );

  return listed.events
    .filter((event) => !event.isAllDay)
    .map((event) => ({
      start: new Date(event.start),
      end: new Date(event.end),
    }))
    .filter(
      (interval) =>
        !Number.isNaN(interval.start.getTime()) &&
        !Number.isNaN(interval.end.getTime()),
    );
}

export async function findBookingPageAvailableSlots(input: {
  page: BookingPageRecord;
  resources: BusinessCalendarResource[];
  maxSlots?: number;
  daysAhead?: number;
  date?: string;
}): Promise<TimeInterval[]> {
  const durationMinutes =
    input.resources[0]?.durationMinutes ?? input.page.slotDurationMinutes;
  const daysAhead = input.daysAhead ?? input.page.advanceBookingDays;
  const operatingHours = buildOperatingHoursFromBookingPage(input.page);

  let windowStart = new Date();
  let windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + daysAhead);
  windowEnd.setHours(23, 59, 59, 999);

  if (input.date) {
    const dayBounds = getTimezoneDayBounds(input.date, input.page.bookingTimezone);
    windowStart = dayBounds.start;
    windowEnd = dayBounds.end;

    if (windowStart.getTime() < Date.now()) {
      windowStart = new Date();
    }
  }

  const busy = await getCalendarBusyIntervals({
    businessId: input.page.businessId,
    timeMin: windowStart,
    timeMax: windowEnd,
  });

  return findAvailableSlots({
    busy,
    windowStart,
    windowEnd,
    durationMinutes,
    stepMinutes: durationMinutes >= 120 ? 30 : 15,
    bufferMinutes: input.page.slotBufferMinutes,
    maxSlots: input.maxSlots ?? (input.date ? 48 : 24),
    operatingHours,
  });
}

export async function getPublicBookingPageSlots(
  slug: string,
  options?: { date?: string },
) {
  const page = await getPublishedBookingPageBySlug(slug);

  if (!page) {
    return null;
  }

  const resources = await listPublicBookingPageResources(page.id);
  const todayKey = formatDateKeyInTimezone(new Date(), page.bookingTimezone);
  const date = options?.date ?? todayKey;

  const slots = await findBookingPageAvailableSlots({
    page,
    resources,
    maxSlots: options?.date ? 48 : 32,
    date,
  });

  return {
    page,
    resources,
    selectedDate: date,
    slots: slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: formatSlotForDisplay(slot, page.bookingTimezone),
    })),
  };
}

export async function findBusinessAvailableSlots(input: {
  businessId: string;
  durationMinutes?: number;
  maxSlots?: number;
  daysAhead?: number;
}): Promise<TimeInterval[]> {
  const [setup, resources] = await Promise.all([
    getBusinessBookingSetup(input.businessId),
    listBusinessCalendarResources(input.businessId),
  ]);

  const durationMinutes =
    input.durationMinutes ??
    resources[0]?.durationMinutes ??
    setup?.slotDurationMinutes ??
    60;
  const daysAhead = input.daysAhead ?? setup?.advanceBookingDays ?? 14;

  const windowStart = new Date();
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + daysAhead);
  windowEnd.setHours(23, 59, 59, 999);

  const busy = await getCalendarBusyIntervals({
    businessId: input.businessId,
    timeMin: windowStart,
    timeMax: windowEnd,
  });

  return findAvailableSlots({
    busy,
    windowStart,
    windowEnd,
    durationMinutes,
    stepMinutes: durationMinutes >= 120 ? 30 : 15,
    bufferMinutes: setup?.slotBufferMinutes ?? 15,
    maxSlots: input.maxSlots ?? 12,
    operatingHours: buildOperatingHoursFromSetup(setup),
  });
}

export async function formatAvailabilityForAiPrompt(
  businessId: string,
): Promise<string> {
  const [setup, resources, slots] = await Promise.all([
    getBusinessBookingSetup(businessId),
    listBusinessCalendarResources(businessId),
    findBusinessAvailableSlots({
      businessId,
      maxSlots: 10,
      daysAhead: 7,
    }),
  ]);

  if (slots.length === 0) {
    return [
      "Live calendar availability: no open slots found in the next 7 days within business hours.",
      "If the customer asks for a time, offer the nearest options from create_task fallback or ask for another day.",
    ].join("\n");
  }

  const timeZone = setup?.bookingTimezone ?? "UTC";
  const lines = slots.map(
    (slot) => `- ${formatSlotForDisplay(slot, timeZone)}`,
  );

  const defaultDuration =
    resources[0]?.durationMinutes != null
      ? `${resources[0].durationMinutes} minutes`
      : "60 minutes";

  return [
    "Live calendar availability (OrzuX events + Google Calendar FreeBusy):",
    ...lines,
    "",
    `Default appointment duration: ${defaultDuration}.`,
    setup?.businessHoursEnabled
      ? `Business hours: ${setup.businessHoursStart}–${setup.businessHoursEnd} (${timeZone}), days ${setup.businessDays.join(", ")}.`
      : "Business hours: not restricted in settings.",
    "When booking, pick a slot from this list when possible. endDateTime = start + resource duration.",
  ].join("\n");
}

export type BookingSlotResolution =
  | {
      status: "available";
      startDateTime: string;
      endDateTime: string;
      resourceName: string | null;
    }
  | {
      status: "rescheduled";
      startDateTime: string;
      endDateTime: string;
      resourceName: string | null;
      originalStartDateTime: string;
    }
  | {
      status: "unavailable";
      reason: string;
      alternatives: string[];
    };

export async function resolveBookingSlot(input: {
  businessId: string;
  bookingPageId?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  resourceName?: string | null;
  preferNearestSlot?: boolean;
}): Promise<BookingSlotResolution> {
  const bookingPage = input.bookingPageId
    ? await getBookingPageByIdAdmin(input.bookingPageId)
    : null;

  const [setup, resources] = await Promise.all([
    getBusinessBookingSetup(input.businessId),
    input.bookingPageId
      ? listPublicBookingPageResources(input.bookingPageId)
      : listBusinessCalendarResources(input.businessId),
  ]);

  const start = parseIsoDateTime(input.startDateTime);
  let end = parseIsoDateTime(input.endDateTime);

  if (!start) {
    return {
      status: "unavailable",
      reason: "Invalid start date/time.",
      alternatives: [],
    };
  }

  const resource =
    matchResourceByName(resources, input.resourceName) ??
    matchResourceFromSummary(resources, input.summary);

  const durationMinutes =
    resource?.durationMinutes ??
    bookingPage?.slotDurationMinutes ??
    setup?.slotDurationMinutes ??
    60;

  if (!end || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  }

  const candidate: TimeInterval = { start, end };
  const daysAhead =
    bookingPage?.advanceBookingDays ?? setup?.advanceBookingDays ?? 14;
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + daysAhead);
  windowEnd.setHours(23, 59, 59, 999);

  const busy = await getCalendarBusyIntervals({
    businessId: input.businessId,
    timeMin: new Date(),
    timeMax: windowEnd,
  });

  const operatingHours = bookingPage
    ? buildOperatingHoursFromBookingPage(bookingPage)
    : buildOperatingHoursFromSetup(setup);
  const bufferMinutes =
    bookingPage?.slotBufferMinutes ?? setup?.slotBufferMinutes ?? 15;
  const timeZone =
    input.timeZone || bookingPage?.bookingTimezone || setup?.bookingTimezone || "UTC";

  if (
    isIntervalFree(candidate, busy, bufferMinutes) &&
    (!operatingHours.enabled ||
      (isWithinOperatingHours(candidate.start, operatingHours) &&
        isWithinOperatingHours(
          new Date(candidate.end.getTime() - 60_000),
          operatingHours,
        )))
  ) {
    return {
      status: "available",
      startDateTime: candidate.start.toISOString(),
      endDateTime: candidate.end.toISOString(),
      resourceName: resource?.name ?? null,
    };
  }

  if (input.preferNearestSlot !== false) {
    const nearest = findNearestAvailableSlot({
      requestedStart: start,
      durationMinutes,
      busy,
      windowEnd,
      bufferMinutes,
      operatingHours,
    });

    if (nearest) {
      return {
        status: "rescheduled",
        startDateTime: nearest.start.toISOString(),
        endDateTime: nearest.end.toISOString(),
        resourceName: resource?.name ?? null,
        originalStartDateTime: candidate.start.toISOString(),
      };
    }
  }

  const alternatives = findAvailableSlots({
    busy,
    windowStart: start,
    windowEnd,
    durationMinutes,
    stepMinutes: 15,
    bufferMinutes,
    maxSlots: 5,
    operatingHours,
  }).map((slot) => formatSlotForDisplay(slot, timeZone));

  return {
    status: "unavailable",
    reason: "Requested time overlaps an existing booking or is outside business hours.",
    alternatives,
  };
}

export async function getCalendarAvailabilityPageData(businessId: string) {
  const [setup, resources, slots] = await Promise.all([
    getBusinessBookingSetup(businessId),
    listBusinessCalendarResources(businessId),
    findBusinessAvailableSlots({
      businessId,
      maxSlots: 8,
    }),
  ]);

  const timeZone = setup?.bookingTimezone ?? "UTC";

  return {
    setup,
    resources,
    slots: slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: formatSlotForDisplay(slot, timeZone),
    })),
    timeZone,
  };
}
