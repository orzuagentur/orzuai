export type TimeInterval = {
  start: Date;
  end: Date;
};

export type OperatingHoursConfig = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  days: number[];
};

function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: dayMap[weekday] ?? 0,
    hour: Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "0", 10),
    minute: Number.parseInt(
      parts.find((part) => part.type === "minute")?.value ?? "0",
      10,
    ),
    year: Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "0", 10),
    month: Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "0", 10),
    day: Number.parseInt(parts.find((part) => part.type === "day")?.value ?? "0", 10),
  };
}

export function isWithinOperatingHours(
  date: Date,
  config: OperatingHoursConfig,
): boolean {
  if (!config.enabled) {
    return true;
  }

  const startMinutes = parseTimeToMinutes(config.start);
  const endMinutes = parseTimeToMinutes(config.end);

  if (startMinutes == null || endMinutes == null) {
    return true;
  }

  const parts = getZonedParts(date, config.timezone || "UTC");

  if (!config.days.includes(parts.dayOfWeek)) {
    return false;
  }

  const currentMinutes = parts.hour * 60 + parts.minute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function intervalsOverlap(
  a: TimeInterval,
  b: TimeInterval,
  bufferMinutes = 0,
): boolean {
  const bufferMs = bufferMinutes * 60 * 1000;

  return (
    a.start.getTime() - bufferMs < b.end.getTime() &&
    a.end.getTime() + bufferMs > b.start.getTime()
  );
}

export function isIntervalFree(
  candidate: TimeInterval,
  busy: TimeInterval[],
  bufferMinutes = 0,
): boolean {
  return !busy.some((block) => intervalsOverlap(candidate, block, bufferMinutes));
}

export function findAvailableSlots(input: {
  busy: TimeInterval[];
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  stepMinutes?: number;
  bufferMinutes?: number;
  maxSlots?: number;
  operatingHours?: OperatingHoursConfig;
}): TimeInterval[] {
  const stepMinutes = input.stepMinutes ?? 30;
  const bufferMinutes = input.bufferMinutes ?? 0;
  const maxSlots = input.maxSlots ?? 12;
  const durationMs = input.durationMinutes * 60 * 1000;
  const stepMs = stepMinutes * 60 * 1000;
  const slots: TimeInterval[] = [];

  let cursor = new Date(input.windowStart);

  while (cursor.getTime() + durationMs <= input.windowEnd.getTime()) {
    const candidate: TimeInterval = {
      start: new Date(cursor),
      end: new Date(cursor.getTime() + durationMs),
    };

    const withinHours = input.operatingHours
      ? isWithinOperatingHours(candidate.start, input.operatingHours) &&
        isWithinOperatingHours(
          new Date(candidate.end.getTime() - 60_000),
          input.operatingHours,
        )
      : true;

    if (
      withinHours &&
      candidate.start.getTime() >= Date.now() &&
      isIntervalFree(candidate, input.busy, bufferMinutes)
    ) {
      slots.push(candidate);

      if (slots.length >= maxSlots) {
        break;
      }
    }

    cursor = new Date(cursor.getTime() + stepMs);
  }

  return slots;
}

export function findNearestAvailableSlot(input: {
  requestedStart: Date;
  durationMinutes: number;
  busy: TimeInterval[];
  windowEnd: Date;
  bufferMinutes?: number;
  operatingHours?: OperatingHoursConfig;
}): TimeInterval | null {
  const slots = findAvailableSlots({
    busy: input.busy,
    windowStart: input.requestedStart,
    windowEnd: input.windowEnd,
    durationMinutes: input.durationMinutes,
    stepMinutes: 15,
    bufferMinutes: input.bufferMinutes,
    maxSlots: 1,
    operatingHours: input.operatingHours,
  });

  if (slots[0]) {
    return slots[0];
  }

  const earlierSlots = findAvailableSlots({
    busy: input.busy,
    windowStart: new Date(),
    windowEnd: input.requestedStart,
    durationMinutes: input.durationMinutes,
    stepMinutes: 15,
    bufferMinutes: input.bufferMinutes,
    maxSlots: 48,
    operatingHours: input.operatingHours,
  });

  const before = [...earlierSlots]
    .reverse()
    .find((slot) => slot.end.getTime() <= input.requestedStart.getTime());

  return before ?? null;
}

export function parseIsoDateTime(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatSlotForDisplay(
  slot: TimeInterval,
  timeZone: string,
  locale = "en-US",
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return formatter.format(slot.start);
}
