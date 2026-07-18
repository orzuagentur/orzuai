import type { VoiceCallDetail } from "@/types/voice-inbox.types";

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
    case "canceled":
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

export function isRingingVoiceCallStatus(status: string): boolean {
  return ["ringing", "initiated", "queued"].includes(status);
}

export function isConnectedVoiceCallStatus(status: string): boolean {
  return ["active", "answered", "in-progress"].includes(status);
}

export function isMissedVoiceCallStatus(status: string): boolean {
  return ["missed", "no-answer", "failed", "busy", "canceled"].includes(status);
}

export function isAiVoiceCall(call: {
  aiHandled?: boolean;
  humanHandled?: boolean;
  callMode?: string | null;
}): boolean {
  return call.callMode === "ai" || (Boolean(call.aiHandled) && !call.humanHandled);
}


export function getVoiceCallDirectionKind(
  call: { direction: "inbound" | "outbound"; status: string },
): "inbound" | "outbound" | "missed" {
  if (isMissedVoiceCallStatus(call.status)) {
    return "missed";
  }

  return call.direction;
}

export function resolveVoiceTurnTimestamp(
  turn: { at?: string },
  call: { createdAt: string; endedAt: string | null },
  index: number,
  totalTurns: number,
): string {
  if (turn.at) {
    return turn.at;
  }

  const startMs = new Date(call.createdAt).getTime();
  const endMs = call.endedAt
    ? new Date(call.endedAt).getTime()
    : Date.now();

  if (totalTurns <= 1) {
    return call.createdAt;
  }

  const progress = index / Math.max(totalTurns - 1, 1);
  return new Date(startMs + (endMs - startMs) * progress).toISOString();
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

export function buildPlaceholderVoiceCallDetail(input: {
  id: string;
  phoneNumber: string;
  status?: string;
  contactId?: string | null;
  contactName?: string | null;
  callMode?: string;
  direction?: "inbound" | "outbound";
  aiHandled?: boolean;
  humanHandled?: boolean;
}): VoiceCallDetail {
  return {
    id: input.id,
    direction: input.direction ?? "outbound",
    phoneNumber: input.phoneNumber,
    status: input.status ?? "ringing",
    provider: "twilio",
    triggerReason: null,
    callMode: input.callMode ?? "human",
    operatorUserId: null,
    createdAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: null,
    aiHandled: input.aiHandled ?? false,
    humanHandled: input.humanHandled ?? false,
    handoffAt: null,
    contactId: input.contactId ?? null,
    contactName: input.contactName ?? null,
    externalCallId: null,
    recordingUrl: null,
    conversationId: null,
    turns: [],
    turnCount: 0,
    hasRecording: false,
    events: [],
  };
}
