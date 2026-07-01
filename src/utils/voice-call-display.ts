export function formatVoiceCallDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) {
    return "—";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder}s`;
}

const PHONE_COUNTRY_PREFIXES: Array<{ prefix: string; label: string }> = [
  { prefix: "+380", label: "Ukraine" },
  { prefix: "+49", label: "Germany" },
  { prefix: "+48", label: "Poland" },
  { prefix: "+44", label: "United Kingdom" },
  { prefix: "+998", label: "Uzbekistan" },
  { prefix: "+7", label: "Russia / Kazakhstan" },
  { prefix: "+1", label: "US / Canada" },
  { prefix: "+34", label: "Spain" },
  { prefix: "+33", label: "France" },
  { prefix: "+39", label: "Italy" },
  { prefix: "+90", label: "Turkey" },
];

export function getPhoneCountryLabel(phoneNumber: string): string | null {
  const normalized = phoneNumber.trim().replace(/[^\d+]/g, "");

  if (!normalized.startsWith("+")) {
    return null;
  }

  const match = PHONE_COUNTRY_PREFIXES.find((entry) =>
    normalized.startsWith(entry.prefix),
  );

  return match?.label ?? null;
}

export function formatVoiceCallDateParts(
  isoDate: string,
  options: { local?: boolean } = {},
): { dateLabel: string; timeLabel: string; fullLabel: string } {
  const date = new Date(isoDate);
  const timeZone = options.local ? undefined : "UTC";
  const dateLabel = date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });

  return {
    dateLabel,
    timeLabel,
    fullLabel: `${dateLabel}, ${timeLabel}`,
  };
}

export function getVoiceCallStatusLabel(status: string): string {
  switch (status) {
    case "active":
    case "answered":
    case "in-progress":
      return "Active";
    case "completed":
      return "Completed";
    case "initiated":
    case "queued":
    case "ringing":
      return "Ringing";
    case "missed":
    case "no-answer":
    case "failed":
      return "Missed";
    default:
      return status;
  }
}

export function getVoiceCallStatusClassName(status: string): string {
  switch (status) {
    case "completed":
      return "text-emerald-700 dark:text-emerald-300";
    case "active":
    case "answered":
    case "in-progress":
      return "text-sky-700 dark:text-sky-300";
    case "missed":
    case "no-answer":
    case "failed":
    case "busy":
    case "canceled":
      return "text-red-700 dark:text-red-300";
    case "ringing":
    case "initiated":
    case "queued":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-muted-foreground";
  }
}

export function isActiveVoiceCallStatus(status: string): boolean {
  return ["active", "answered", "in-progress", "ringing", "initiated", "queued"].includes(
    status,
  );
}

export function isMissedVoiceCallStatus(status: string): boolean {
  return ["missed", "no-answer", "failed", "busy", "canceled"].includes(status);
}

export type VoiceCallFilter = "all" | "inbound" | "outbound" | "missed";

export function filterVoiceCalls<T extends { direction: "inbound" | "outbound"; status: string }>(
  calls: T[],
  filter: VoiceCallFilter,
): T[] {
  if (filter === "all") {
    return calls;
  }

  if (filter === "inbound") {
    return calls.filter((call) => call.direction === "inbound");
  }

  if (filter === "outbound") {
    return calls.filter((call) => call.direction === "outbound");
  }

  return calls.filter((call) => isMissedVoiceCallStatus(call.status));
}
