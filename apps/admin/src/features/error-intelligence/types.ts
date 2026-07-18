export const ERROR_SEVERITIES = [
  "critical",
  "high",
  "warning",
  "info",
] as const;

export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export const ERROR_STATUSES = [
  "open",
  "investigating",
  "resolved",
  "ignored",
] as const;

export type ErrorStatus = (typeof ERROR_STATUSES)[number];

export const ERROR_ENVIRONMENTS = [
  "production",
  "preview",
  "development",
  "test",
] as const;

export type ErrorEnvironment = (typeof ERROR_ENVIRONMENTS)[number];

export const ERROR_MODULES = [
  "platform",
  "database",
  "ai",
  "whatsapp",
  "twilio",
  "email",
  "telegram",
  "instagram",
  "website",
  "browser",
  "network",
  "security",
  "voice",
  "cron",
  "webhook",
  "billing",
] as const;

export type ErrorModule = (typeof ERROR_MODULES)[number];

export type ErrorIntelligenceEvent = {
  id: string;
  fingerprint: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  environment: ErrorEnvironment;
  module: ErrorModule | string;
  category: string;
  source: string;
  title: string;
  message: string;
  description: string;
  rootCause: string | null;
  suggestedFix: string | null;
  impact: string | null;
  recurrenceRisk: string | null;
  businessId: string | null;
  businessName: string | null;
  userId: string | null;
  conversationId: string | null;
  sessionId: string | null;
  correlationId: string | null;
  traceId: string | null;
  deploymentId: string | null;
  commitHash: string | null;
  appVersion: string | null;
  region: string | null;
  httpStatus: number | null;
  method: string | null;
  path: string | null;
  durationMs: number | null;
  retryCount: number;
  occurrences: number;
  assignedTo: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  browser: string | null;
  device: string | null;
  ip: string | null;
  country: string | null;
  language: string | null;
  requestHeaders: Record<string, unknown>;
  requestBody: unknown;
  responseBody: unknown;
  stackTrace: string | null;
  rawLog: string | null;
  terminal: Record<string, unknown>;
  context: Record<string, unknown>;
  ai: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ErrorIntelligenceBusinessSnapshot = {
  id: string;
  name: string;
  ownerEmail: string | null;
  ownerName: string | null;
  phone: string | null;
  plan: string | null;
  status: string | null;
  createdAt: string | null;
  contactsCount: number;
  messagesCount: number;
  conversationsCount: number;
  openErrorsCount: number;
  recentErrorTitles: string[];
};

export type ErrorIntelligenceStats = {
  openCritical: number;
  openHigh: number;
  openWarning: number;
  resolvedToday: number;
  lastHour: number;
  lastDay: number;
  topModules: Array<{ module: string; count: number }>;
};

export type ErrorIntelligenceListFilters = {
  query?: string;
  severity?: ErrorSeverity | "";
  status?: ErrorStatus | "";
  module?: string;
  environment?: ErrorEnvironment | "";
  businessId?: string;
  limit?: number;
};

export function severityTone(severity: ErrorSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-rose-500/15 text-rose-700 border-rose-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    case "warning":
      return "bg-amber-500/15 text-amber-800 border-amber-500/30";
    case "info":
      return "bg-sky-500/15 text-sky-700 border-sky-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function statusTone(status: ErrorStatus): string {
  switch (status) {
    case "resolved":
      return "bg-emerald-500/15 text-emerald-700";
    case "ignored":
      return "bg-slate-500/15 text-slate-600";
    case "investigating":
      return "bg-violet-500/15 text-violet-700";
    default:
      return "bg-rose-500/10 text-rose-700";
  }
}

export function rowAccentClass(severity: ErrorSeverity, status: ErrorStatus): string {
  if (status === "resolved") {
    return "border-l-emerald-500";
  }
  switch (severity) {
    case "critical":
      return "border-l-rose-500";
    case "high":
      return "border-l-orange-500";
    case "warning":
      return "border-l-amber-400";
    default:
      return "border-l-sky-500";
  }
}
