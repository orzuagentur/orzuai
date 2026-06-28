export type DayAvailability = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeeklySchedule = Record<number, DayAvailability>;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** @deprecated Use WEEKDAY_LABELS */
export const WEEKDAY_LABELS_RU = WEEKDAY_LABELS;

export const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
] as const;

export function getWeeklyScheduleFieldErrors(
  schedule: WeeklySchedule,
): Record<number, { start?: string; end?: string }> {
  const errors: Record<number, { start?: string; end?: string }> = {};

  for (let day = 0; day <= 6; day += 1) {
    const daySchedule = schedule[day];

    if (!daySchedule?.enabled) {
      continue;
    }

    if (!isValidTimeString(daySchedule.start)) {
      errors[day] = { ...errors[day], start: "Invalid start time (HH:MM, 00:00–23:59)" };
    }

    if (!isValidTimeString(daySchedule.end)) {
      errors[day] = { ...errors[day], end: "Invalid end time (HH:MM, 00:00–23:59)" };
    } else if (
      isValidTimeString(daySchedule.start) &&
      timeToMinutes(daySchedule.end) <= timeToMinutes(daySchedule.start)
    ) {
      errors[day] = { ...errors[day], end: "End time must be after start time" };
    }
  }

  return errors;
}

export function createDefaultWeeklySchedule(): WeeklySchedule {
  return {
    0: { enabled: false, start: "09:00", end: "17:00" },
    1: { enabled: true, start: "09:00", end: "17:00" },
    2: { enabled: true, start: "09:00", end: "17:00" },
    3: { enabled: true, start: "09:00", end: "17:00" },
    4: { enabled: true, start: "09:00", end: "17:00" },
    5: { enabled: true, start: "09:00", end: "17:00" },
    6: { enabled: false, start: "09:00", end: "17:00" },
  };
}

export function parseWeeklySchedule(raw: unknown): WeeklySchedule {
  const defaults = createDefaultWeeklySchedule();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const record = raw as Record<string, unknown>;
  const result = { ...defaults };

  for (let day = 0; day <= 6; day += 1) {
    const entry = record[String(day)];

    if (!entry || typeof entry !== "object") {
      continue;
    }

    const value = entry as Record<string, unknown>;
    result[day] = {
      enabled: Boolean(value.enabled),
      start: typeof value.start === "string" ? value.start : defaults[day]!.start,
      end: typeof value.end === "string" ? value.end : defaults[day]!.end,
    };
  }

  return result;
}

export function weeklyScheduleToBusinessDays(schedule: WeeklySchedule): number[] {
  return Object.entries(schedule)
    .filter(([, day]) => day.enabled)
    .map(([day]) => Number.parseInt(day, 10))
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

export function getPrimaryHoursFromSchedule(schedule: WeeklySchedule): {
  start: string;
  end: string;
} {
  const enabled = Object.values(schedule).filter((day) => day.enabled);

  if (enabled.length === 0) {
    return { start: "09:00", end: "17:00" };
  }

  return {
    start: enabled[0]!.start,
    end: enabled[0]!.end,
  };
}

export function formatTime12h(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return value;
  }

  let hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = match[2] ?? "00";
  const suffix = hours >= 12 ? "PM" : "AM";

  hours %= 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes}${suffix}`;
}

export function timeToMinutes(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return 0;
  }

  return Number.parseInt(match[1] ?? "0", 10) * 60 + Number.parseInt(match[2] ?? "0", 10);
}

export function isValidTimeString(value: string): boolean {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return false;
  }

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);

  return (
    Number.isFinite(hours) &&
    Number.isFinite(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

export function validateWeeklySchedule(schedule: WeeklySchedule): {
  valid: boolean;
  message?: string;
  day?: number;
  field?: "start" | "end";
} {
  let hasEnabledDay = false;

  for (let day = 0; day <= 6; day += 1) {
    const daySchedule = schedule[day];

    if (!daySchedule?.enabled) {
      continue;
    }

    hasEnabledDay = true;

    if (!isValidTimeString(daySchedule.start)) {
      return {
        valid: false,
        message: `${WEEKDAY_LABELS[day]}: invalid start time "${daySchedule.start}". Use HH:MM (hours 00–23, minutes 00–59).`,
        day,
        field: "start",
      };
    }

    if (!isValidTimeString(daySchedule.end)) {
      return {
        valid: false,
        message: `${WEEKDAY_LABELS[day]}: invalid end time "${daySchedule.end}". Use HH:MM (hours 00–23, minutes 00–59).`,
        day,
        field: "end",
      };
    }

    if (timeToMinutes(daySchedule.end) <= timeToMinutes(daySchedule.start)) {
      return {
        valid: false,
        message: `${WEEKDAY_LABELS[day]}: end time must be after start time.`,
        day,
        field: "end",
      };
    }
  }

  if (!hasEnabledDay) {
    return {
      valid: false,
      message: "Select at least one available day.",
    };
  }

  return { valid: true };
}

export function buildWeeklyScheduleFromSetup(setup: {
  weeklySchedule?: WeeklySchedule;
  businessDays?: number[];
  businessHoursStart?: string;
  businessHoursEnd?: string;
} | null): WeeklySchedule {
  if (setup?.weeklySchedule && Object.keys(setup.weeklySchedule).length > 0) {
    return setup.weeklySchedule;
  }

  const schedule = createDefaultWeeklySchedule();

  for (let day = 0; day <= 6; day += 1) {
    schedule[day] = {
      enabled: setup?.businessDays?.includes(day) ?? (day >= 1 && day <= 5),
      start: setup?.businessHoursStart ?? "09:00",
      end: setup?.businessHoursEnd ?? "17:00",
    };
  }

  return schedule;
}

export function hasBookingPage(setup: {
  bookingPageTitle?: string;
  bookingPagePublished?: boolean;
} | null): boolean {
  if (!setup) {
    return false;
  }

  return (
    setup.bookingPagePublished === true ||
    Boolean(setup.bookingPageTitle?.trim())
  );
}
