export const AUTOMATION_TRIGGERS = [
  { id: "new_message", label: "New message received" },
  { id: "form_submit", label: "Website form submitted" },
  { id: "no_reply_24h", label: "No customer reply for 24 hours" },
  { id: "tag_added", label: "Contact tag added" },
] as const;

export const AUTOMATION_ACTIONS = [
  { id: "send_message", label: "Send AI message" },
  { id: "create_task", label: "Create CRM task" },
  { id: "update_stage", label: "Update pipeline stage" },
  { id: "notify", label: "Notify team" },
] as const;

export const AUTOMATION_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome new lead",
    triggerType: "form_submit" as const,
    actionType: "send_message" as const,
  },
  {
    id: "followup",
    name: "24h no-reply follow-up",
    triggerType: "no_reply_24h" as const,
    actionType: "send_message" as const,
  },
  {
    id: "qualify",
    name: "Qualify hot lead",
    triggerType: "new_message" as const,
    actionType: "update_stage" as const,
  },
  {
    id: "task",
    name: "Create task on form",
    triggerType: "form_submit" as const,
    actionType: "create_task" as const,
  },
  {
    id: "escalate",
    name: "Escalate to team",
    triggerType: "tag_added" as const,
    actionType: "notify" as const,
  },
] as const;

export const AUTOMATIONS_MESSAGES = {
  pageTitle: "Automations",
  pageDescription:
    "Build workflows that react to messages, forms, and CRM events automatically.",
  create: "Create automation",
  empty: "No automations yet. Start from a template or create your own.",
  enabled: "Enabled",
  disabled: "Disabled",
  templatesTitle: "Templates",
  saved: "Automation saved.",
  deleted: "Automation deleted.",
  saveFailed: "Unable to save automation.",
  nameLabel: "Name",
  triggerLabel: "When",
  actionLabel: "Then",
} as const;
