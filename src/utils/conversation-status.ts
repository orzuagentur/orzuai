import type { ConversationStatus } from "@/types/database.types";

export const CONVERSATION_STATUS_OPTIONS: ConversationStatus[] = [
  "open",
  "pending",
  "resolved",
  "snoozed",
  "active",
  "archived",
  "closed",
];

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  snoozed: "Snoozed",
  active: "Open",
  archived: "Snoozed",
  closed: "Resolved",
};

export function getConversationStatusLabel(status: ConversationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getConversationStatusVariant(
  status: ConversationStatus,
): "default" | "secondary" | "outline" {
  if (status === "open" || status === "active") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function getConversationStatusClassName(
  status: ConversationStatus,
): string {
  if (status === "open" || status === "active") {
    return "border-info/30 bg-info/10 text-info";
  }

  if (status === "pending") {
    return "border-warning/30 bg-warning/10 text-warning";
  }

  if (status === "resolved" || status === "closed") {
    return "border-success/30 bg-success/10 text-success";
  }

  return "border-muted-foreground/20 bg-muted text-muted-foreground";
}
