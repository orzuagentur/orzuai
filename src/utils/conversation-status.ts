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
