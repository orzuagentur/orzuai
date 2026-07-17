export type AutomationStats = {
  followUpsSent: number;
  qualifiedContacts: number;
  crmTasksCreated: number;
  activeRules: number;
};

export type AutomationActivityType =
  | "follow_up_sent"
  | "crm_task_created"
  | "contact_qualified"
  | "workflow_run";

export type AutomationActivityItem = {
  id: string;
  type: AutomationActivityType;
  title: string;
  detail?: string;
  occurredAt: string;
};
