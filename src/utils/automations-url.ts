import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { AutomationRuleId } from "@/features/automations/rule-catalog";
import { isAutomationRuleId } from "@/features/automations/rule-catalog";

export const AUTOMATIONS_TABS = ["overview", "rules", "activity"] as const;

export type AutomationsTab = (typeof AUTOMATIONS_TABS)[number];

export type AutomationsUrlState = {
  tab?: AutomationsTab;
  rule?: AutomationRuleId | null;
  workflow?: string | null;
  step?: 1 | 2 | 3 | null;
};

export function isAutomationsTab(value: string): value is AutomationsTab {
  return (AUTOMATIONS_TABS as readonly string[]).includes(value);
}

export function buildAutomationsHref(state: AutomationsUrlState = {}): string {
  const params = new URLSearchParams();

  if (state.tab && state.tab !== "overview") {
    params.set("tab", state.tab);
  }

  if (state.workflow) {
    params.set("workflow", state.workflow);
  } else if (state.rule) {
    params.set("rule", state.rule);
  }

  if (state.workflow === "new" && state.step && state.step !== 1) {
    params.set("step", String(state.step));
  }

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.automations}?${query}`
    : DASHBOARD_ROUTES.automations;
}

export function parseAutomationsSearchParams(input: {
  tab?: string;
  rule?: string;
  workflow?: string;
  step?: string;
}): {
  activeTab: AutomationsTab;
  activeRuleId: AutomationRuleId | null;
  activeWorkflowId: string | null;
  isNewWorkflow: boolean;
  createWizardStep: 1 | 2 | 3;
} {
  const activeTab =
    input.tab && isAutomationsTab(input.tab) ? input.tab : "overview";
  const isNewWorkflow = input.workflow === "new";
  const activeWorkflowId =
    input.workflow && input.workflow !== "new" ? input.workflow : null;
  const activeRuleId =
    !input.workflow && input.rule && isAutomationRuleId(input.rule)
      ? input.rule
      : null;
  const parsedStep = Number(input.step);
  const createWizardStep =
    isNewWorkflow && (parsedStep === 2 || parsedStep === 3) ? parsedStep : 1;

  return {
    activeTab,
    activeRuleId,
    activeWorkflowId,
    isNewWorkflow,
    createWizardStep,
  };
}
