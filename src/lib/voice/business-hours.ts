export type BusinessHoursConfig = {
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

export function isWithinBusinessHours(config: BusinessHoursConfig): boolean {
  if (!config.enabled) {
    return true;
  }

  const startMinutes = parseTimeToMinutes(config.start);
  const endMinutes = parseTimeToMinutes(config.end);

  if (startMinutes == null || endMinutes == null) {
    return true;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: config.timezone || "UTC",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    const hour = Number.parseInt(
      parts.find((part) => part.type === "hour")?.value ?? "0",
      10,
    );
    const minute = Number.parseInt(
      parts.find((part) => part.type === "minute")?.value ?? "0",
      10,
    );

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dayOfWeek = dayMap[weekday] ?? 0;
    const currentMinutes = hour * 60 + minute;

    if (!config.days.includes(dayOfWeek)) {
      return false;
    }

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } catch {
    return true;
  }
}
