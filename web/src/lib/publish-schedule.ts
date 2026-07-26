export const MIN_PUBLISH_GAP_MINUTES = 6 * 60;
export const MAX_AUTOPUBLISH_VIDEOS_PER_DAY = 4;
export const SCHEDULE_GENERATION_LEAD_MINUTES = 6 * 60;
export const MAX_PUBLISH_DRIFT_MINUTES = 10;

const DEFAULT_TIMES_BY_COUNT: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "17:00"],
  3: ["09:00", "15:00", "21:00"],
  4: ["03:00", "09:00", "15:00", "21:00"],
};

export function clampVideosPerDay(value: unknown): number {
  return Math.min(
    MAX_AUTOPUBLISH_VIDEOS_PER_DAY,
    Math.max(1, Number(value) || 2),
  );
}

export function defaultTimesForCount(count: number): string[] {
  const n = clampVideosPerDay(count);
  return [...(DEFAULT_TIMES_BY_COUNT[n] || DEFAULT_TIMES_BY_COUNT[2])];
}

export function normalizeTime(value: unknown): string {
  const [rawH = "", rawM = "00"] = String(value || "").trim().split(":");
  const h = Math.min(23, Math.max(0, Number(rawH) || 0));
  const m = Math.min(59, Math.max(0, Number(rawM) || 0));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = normalizeTime(hhmm).split(":");
  return Number(h) * 60 + Number(m || 0);
}

export function padScheduleTimes(count: number, existing: unknown[]): string[] {
  const n = clampVideosPerDay(count);
  const out = existing.map(normalizeTime).filter(Boolean).slice(0, n);
  for (const fallback of defaultTimesForCount(n)) {
    if (out.length >= n) break;
    if (!out.includes(fallback)) out.push(fallback);
  }
  while (out.length < n) {
    const fallback = `${String((9 + out.length * 6) % 24).padStart(2, "0")}:00`;
    if (!out.includes(fallback)) out.push(fallback);
    else out.push(`${String((out.length * 6) % 24).padStart(2, "0")}:00`);
  }
  return out.slice(0, n);
}

export function validatePublishTimes(times: string[]): string | null {
  if (new Set(times).size !== times.length) {
    return "Each video needs a different time of day.";
  }
  const sorted = [...times].map(timeToMinutes).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < MIN_PUBLISH_GAP_MINUTES) {
      return "Keep at least 6 hours between scheduled YouTube publish times.";
    }
  }
  return null;
}
