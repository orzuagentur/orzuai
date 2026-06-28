export const HOUR_HEIGHT_PX = 72;
export const DAY_START_HOUR = 0;
export const DAY_END_HOUR = 24;

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getMonthGridDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function formatHeaderDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    day: "numeric",
  });
}

export function formatShortWeekday(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { weekday: "short" });
}

export function formatDayColumnHeader(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
  });
}

export function eventOccursOnDay(
  event: { start: string; end: string; isAllDay: boolean },
  day: Date,
): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  if (event.isAllDay) {
    const eventDay = new Date(`${event.start}T12:00:00`);
    return isSameDay(eventDay, day);
  }

  const start = new Date(event.start);
  const end = new Date(event.end);
  return start < dayEnd && end > dayStart;
}

export function getTimedEventLayout(
  event: { start: string; end: string },
  day: Date,
): { top: number; height: number } | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (start >= dayEnd || end <= dayStart) {
    return null;
  }

  const visibleStart = start < dayStart ? dayStart : start;
  const visibleEnd = end > dayEnd ? dayEnd : end;
  const startMinutes = visibleStart.getHours() * 60 + visibleStart.getMinutes();
  const endMinutes = visibleEnd.getHours() * 60 + visibleEnd.getMinutes();
  const durationMinutes = Math.max(endMinutes - startMinutes, 15);

  return {
    top: (startMinutes / 60) * HOUR_HEIGHT_PX,
    height: (durationMinutes / 60) * HOUR_HEIGHT_PX,
  };
}

export function formatTimeRange(
  startIso: string,
  endIso: string,
  locale?: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startIso))} – ${formatter.format(new Date(endIso))}`;
}

export function formatEventDateTimeRange(
  startIso: string,
  endIso: string,
  locale?: string,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (isSameDay(start, end)) {
    return formatTimeRange(startIso, endIso, locale);
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatSingleDateTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDueDate(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function isSameCalendarDay(startIso: string, endIso: string): boolean {
  return isSameDay(new Date(startIso), new Date(endIso));
}

export function dateTimeFromGridClick(
  day: Date,
  offsetY: number,
  hourHeight = HOUR_HEIGHT_PX,
): Date {
  const minutes = Math.floor((offsetY / hourHeight) * 60);
  const snapped = Math.round(minutes / 15) * 15;
  const result = startOfDay(day);
  result.setMinutes(snapped);
  return result;
}

export function getEventStartTop(
  event: { start: string; end: string },
  day: Date,
): number | null {
  const layout = getTimedEventLayout(event, day);
  return layout?.top ?? null;
}

export function eventsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

export type TimedEventColumnLayout<T extends { start: string; end: string }> = {
  item: T;
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

export function layoutTimedEventsInColumns<T extends { start: string; end: string }>(
  items: T[],
  day: Date,
  minHeight = 44,
): TimedEventColumnLayout<T>[] {
  const positioned = items
    .map((item) => {
      const layout = getTimedEventLayout(item, day);
      if (!layout) return null;
      return {
        item,
        top: layout.top,
        height: Math.max(layout.height, minHeight),
      };
    })
    .filter(
      (entry): entry is { item: T; top: number; height: number } => entry !== null,
    )
    .sort(
      (a, b) =>
        a.top - b.top ||
        new Date(a.item.start).getTime() - new Date(b.item.start).getTime() ||
        new Date(b.item.end).getTime() - new Date(a.item.end).getTime(),
    );

  const columns: T[][] = [];
  const preliminary: Array<{ item: T; top: number; height: number; column: number }> = [];

  for (const entry of positioned) {
    let placedColumn = -1;

    for (let column = 0; column < columns.length; column += 1) {
      const columnItems = columns[column];
      if (!columnItems) continue;

      const overlapsColumn = columnItems.some((existing) => eventsOverlap(existing, entry.item));
      if (!overlapsColumn) {
        columnItems.push(entry.item);
        placedColumn = column;
        break;
      }
    }

    if (placedColumn === -1) {
      placedColumn = columns.length;
      columns.push([entry.item]);
    }

    preliminary.push({
      item: entry.item,
      top: entry.top,
      height: entry.height,
      column: placedColumn,
    });
  }

  return preliminary.map((entry) => {
    const overlapping = preliminary.filter(
      (other) => other.item !== entry.item && eventsOverlap(other.item, entry.item),
    );
    const columnCount =
      Math.max(entry.column, ...overlapping.map((other) => other.column), 0) + 1;

    return {
      ...entry,
      columnCount,
    };
  });
}

export function getColumnEventStyle(column: number, columnCount: number): {
  left: string;
  width: string;
} {
  const gapPx = 4;
  const widthPercent = 100 / columnCount;

  return {
    left: `calc(${column * widthPercent}% + ${gapPx / 2}px)`,
    width: `calc(${widthPercent}% - ${gapPx}px)`,
  };
}

const BOOKING_CHIP_COLORS = [
  "#1a73e8",
  "#33b679",
  "#e67c73",
  "#f4511e",
  "#8e24aa",
  "#039be5",
  "#616161",
  "#3f51b5",
  "#0b8043",
  "#d50000",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function getBookingChipColor(seed: string): string {
  return (
    BOOKING_CHIP_COLORS[hashString(seed) % BOOKING_CHIP_COLORS.length] ??
    BOOKING_CHIP_COLORS[0]
  );
}

export const BOOKING_CHIP_SIZE_PX = 22;
export const BOOKING_CHIP_GAP_PX = 3;
