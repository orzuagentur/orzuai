import type { LucideIcon } from "lucide-react";
import {
  Clock3Icon,
  KanbanIcon,
  ListTodoIcon,
  TargetIcon,
} from "lucide-react";

import type { SalesAgentSettings } from "@/types/ai-usage.types";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

export const AUTOMATION_RULE_IDS = [
  "follow_up",
  "lead_scoring",
  "auto_qualify",
  "crm_auto_task",
] as const;

export type AutomationRuleId = (typeof AUTOMATION_RULE_IDS)[number];

export function isAutomationRuleId(value: string): value is AutomationRuleId {
  return (AUTOMATION_RULE_IDS as readonly string[]).includes(value);
}

export type AutomationRuleDefinition = {
  id: AutomationRuleId;
  name: string;
  description: string;
  triggerSummary: string;
  actionSummary: string;
  icon: LucideIcon;
};

export const AUTOMATION_RULES: AutomationRuleDefinition[] = [
  {
    id: "follow_up",
    name: "Follow-up Agent",
    description:
      "Automatically sends AI follow-up messages when a customer has not replied after 24 or 48 hours.",
    triggerSummary: "No customer reply for 24h / 48h",
    actionSummary: "Send AI message in chat",
    icon: Clock3Icon,
  },
  {
    id: "lead_scoring",
    name: "Lead Scoring (BANT)",
    description:
      "Scores every inbound message and updates the contact lead score and AI summary.",
    triggerSummary: "New customer message",
    actionSummary: "Update lead score & summary",
    icon: TargetIcon,
  },
  {
    id: "auto_qualify",
    name: "Auto-qualify Pipeline",
    description:
      "Moves contacts to the Qualified pipeline stage when their lead score crosses your threshold.",
    triggerSummary: "Lead score ≥ threshold",
    actionSummary: "Set pipeline stage to Qualified",
    icon: KanbanIcon,
  },
  {
    id: "crm_auto_task",
    name: "CRM Auto-task",
    description:
      "Creates a follow-up task when high-intent keywords appear and the lead score is high enough.",
    triggerSummary: "High-intent keywords + score",
    actionSummary: "Create CRM task",
    icon: ListTodoIcon,
  },
];

export function getAutomationRule(
  ruleId: AutomationRuleId,
): AutomationRuleDefinition {
  return AUTOMATION_RULES.find((rule) => rule.id === ruleId) ?? AUTOMATION_RULES[0]!;
}

export function isRuleEnabled(
  ruleId: AutomationRuleId,
  salesAgent: SalesAgentSettings,
  followUpAgent: FollowUpAgentSettings,
): boolean {
  switch (ruleId) {
    case "follow_up":
      return followUpAgent.enabled;
    case "lead_scoring":
      return salesAgent.salesAgentEnabled;
    case "auto_qualify":
      return salesAgent.salesAgentEnabled && salesAgent.autoQualifyPipeline;
    case "crm_auto_task":
      return salesAgent.salesAgentEnabled && salesAgent.autoTaskEnabled;
    default:
      return false;
  }
}

export function countActiveRules(
  salesAgent: SalesAgentSettings,
  followUpAgent: FollowUpAgentSettings,
): number {
  return AUTOMATION_RULE_IDS.filter((ruleId) =>
    isRuleEnabled(ruleId, salesAgent, followUpAgent),
  ).length;
}

export type AutomationRecipeId =
  | "never_miss_lead"
  | "auto_qualify_buyers"
  | "hot_lead_task";

const RECIPE_RULE_IDS: Record<AutomationRecipeId, AutomationRuleId[]> = {
  never_miss_lead: ["follow_up"],
  auto_qualify_buyers: ["lead_scoring", "auto_qualify"],
  hot_lead_task: ["crm_auto_task"],
};

export function isRecipeEnabled(
  recipeId: AutomationRecipeId,
  salesAgent: SalesAgentSettings,
  followUpAgent: FollowUpAgentSettings,
): boolean {
  return RECIPE_RULE_IDS[recipeId].every((ruleId) =>
    isRuleEnabled(ruleId, salesAgent, followUpAgent),
  );
}
