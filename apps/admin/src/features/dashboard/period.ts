export const ANALYTICS_PERIODS = [
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "90d", label: "90 дней" },
  { id: "month", label: "Текущий месяц" },
  { id: "year", label: "Текущий год" },
  { id: "all", label: "Всё время" },
] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]["id"];

export type PeriodRange = {
  start: string | null;
  end: string;
  label: string;
};

export function resolveAnalyticsPeriod(
  period: string | null | undefined,
): AnalyticsPeriod {
  const normalized = period?.trim().toLowerCase();

  if (
    normalized &&
    ANALYTICS_PERIODS.some((entry) => entry.id === normalized)
  ) {
    return normalized as AnalyticsPeriod;
  }

  return "30d";
}

export function getPeriodRange(period: AnalyticsPeriod): PeriodRange {
  const end = new Date();
  const start = new Date(end);

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 7);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "7 дней",
      };
    case "30d":
      start.setDate(start.getDate() - 30);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "30 дней",
      };
    case "90d":
      start.setDate(start.getDate() - 90);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "90 дней",
      };
    case "month":
      return {
        start: new Date(end.getFullYear(), end.getMonth(), 1).toISOString(),
        end: end.toISOString(),
        label: "Текущий месяц",
      };
    case "year":
      return {
        start: new Date(end.getFullYear(), 0, 1).toISOString(),
        end: end.toISOString(),
        label: "Текущий год",
      };
    case "all":
      return {
        start: null,
        end: end.toISOString(),
        label: "Всё время",
      };
  }
}
