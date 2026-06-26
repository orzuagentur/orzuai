import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { AutomationRuleId } from "@/features/automations/rule-catalog";
import type { AutomationWorkflowItem } from "@/features/automations/workflow-types";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { AutomationsTab } from "@/utils/automations-url";
import type { AiUsageSummary, SalesAgentSettings } from "@/types/ai-usage.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

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

export type AutomationsPageData = {
  hasBusiness: boolean;
  activeTab: AutomationsTab;
  activeRuleId: AutomationRuleId | null;
  activeWorkflowId: string | null;
  isNewWorkflow: boolean;
  createWizardStep: 1 | 2 | 3;
  usage: AiUsageSummary | null;
  salesAgent: SalesAgentSettings;
  followUpAgent: FollowUpAgentSettings;
  stats: AutomationStats;
  activity: AutomationActivityItem[];
  workflows: AutomationWorkflowItem[];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
};
