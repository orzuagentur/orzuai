import type { LucideIcon } from "lucide-react";
import { Clock3Icon } from "lucide-react";

import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

export const AUTOMATION_RULE_IDS = ["follow_up"] as const;

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
];

export function getAutomationRule(
  ruleId: AutomationRuleId,
): AutomationRuleDefinition {
  return AUTOMATION_RULES.find((rule) => rule.id === ruleId) ?? AUTOMATION_RULES[0]!;
}

export function isRuleEnabled(
  ruleId: AutomationRuleId,
  followUpAgent: FollowUpAgentSettings,
): boolean {
  switch (ruleId) {
    case "follow_up":
      return followUpAgent.enabled;
    default:
      return false;
  }
}

export function countActiveRules(followUpAgent: FollowUpAgentSettings): number {
  return AUTOMATION_RULE_IDS.filter((ruleId) =>
    isRuleEnabled(ruleId, followUpAgent),
  ).length;
}

export type AutomationRecipeId = "never_miss_lead";

const RECIPE_RULE_IDS: Record<AutomationRecipeId, AutomationRuleId[]> = {
  never_miss_lead: ["follow_up"],
};

export function isRecipeEnabled(
  recipeId: AutomationRecipeId,
  followUpAgent: FollowUpAgentSettings,
): boolean {
  return RECIPE_RULE_IDS[recipeId].every((ruleId) =>
    isRuleEnabled(ruleId, followUpAgent),
  );
}
