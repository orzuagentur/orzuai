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
