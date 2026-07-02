export type AuditLogEntry = {
  id: string;
  businessId: string | null;
  businessName: string | null;
  action: string;
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export const AUDIT_ACTION_OPTIONS = [
  { value: "", label: "Все действия" },
  { value: "controls.updated", label: "Изменены настройки" },
  { value: "business.deleted", label: "Бизнес удалён" },
  { value: "support.thread_created", label: "Support thread" },
  { value: "support.message_sent", label: "Support сообщение" },
  { value: "admin.sms_sent", label: "Admin SMS" },
  { value: "impersonation.preview_link", label: "Preview link" },
] as const;

export function auditActionLabel(action: string): string {
  switch (action) {
    case "controls.updated":
      return "Изменены настройки";
    case "business.deleted":
      return "Бизнес удалён";
    case "support.thread_created":
      return "Создан support thread";
    case "support.message_sent":
      return "Сообщение поддержки";
    case "admin.sms_sent":
      return "SMS от admin";
    case "impersonation.preview_link":
      return "Preview link (read-only)";
    default:
      return action;
  }
}

export function auditActionTone(
  action: string,
): "default" | "warning" | "danger" | "info" {
  if (action === "business.deleted") return "danger";
  if (action === "controls.updated") return "warning";
  if (action.startsWith("support.")) return "info";
  return "default";
}

export function formatAuditMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  if (entries.length === 0) {
    return "";
  }

  return entries
    .slice(0, 6)
    .map(([key, value]) => {
      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(" · ");
}
