import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export { WEEKDAY_LABELS };

export function createEmptyScheduleSlot(): AgentScheduleSlot {
  return {
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "18:00",
  };
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function getZonedDateParts(date: Date, timeZone: string): {
  weekday: number;
  minutes: number;
} | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;

    if (!weekday || hour === undefined || minute === undefined) {
      return null;
    }

    const weekdayIndex = WEEKDAY_LABELS.indexOf(
      weekday as (typeof WEEKDAY_LABELS)[number],
    );

    if (weekdayIndex < 0) {
      return null;
    }

    return {
      weekday: weekdayIndex,
      minutes: Number(hour) * 60 + Number(minute),
    };
  } catch {
    return null;
  }
}

export function isAgentWithinSchedule(input: {
  scheduleEnabled: boolean;
  timezone: string;
  slots: AgentScheduleSlot[];
  now?: Date;
}): boolean {
  if (!input.scheduleEnabled || input.slots.length === 0) {
    return true;
  }

  const now = input.now ?? new Date();
  const parts = getZonedDateParts(now, input.timezone.trim() || "UTC");

  if (!parts) {
    return true;
  }

  return input.slots.some((slot) => {
    if (!slot.days.includes(parts.weekday)) {
      return false;
    }

    const startMinutes = parseTimeToMinutes(slot.start);
    const endMinutes = parseTimeToMinutes(slot.end);

    if (startMinutes === null || endMinutes === null) {
      return false;
    }

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      return parts.minutes >= startMinutes && parts.minutes < endMinutes;
    }

    return parts.minutes >= startMinutes || parts.minutes < endMinutes;
  });
}

export const COMMON_SCHEDULE_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Tashkent",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
] as const;
