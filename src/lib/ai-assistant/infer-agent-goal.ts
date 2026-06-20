import type { AgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import type { AgentIconId } from "@/features/ai-assistant/agent-icons";

const ICON_GOAL_MAP: Partial<Record<AgentIconId, AgentWizardGoalId>> = {
  target: "sales",
  headphones: "support",
  calendar: "booking",
  wrench: "custom",
};

export function inferAgentGoalFromIcon(
  icon: AgentIconId | string | null | undefined,
): AgentWizardGoalId {
  if (icon && icon in ICON_GOAL_MAP) {
    return ICON_GOAL_MAP[icon as AgentIconId] ?? "custom";
  }

  return "custom";
}

export function isAgentGoalId(value: string): value is AgentWizardGoalId {
  return value === "sales" || value === "support" || value === "booking" || value === "custom";
}
