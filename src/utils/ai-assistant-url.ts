import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isAgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import type { MessagingChannel } from "@/types/database.types";

export const AI_ASSISTANT_TABS = ["agents"] as const;

export type AiAssistantTab = (typeof AI_ASSISTANT_TABS)[number];

export type AiAssistantUrlState = {
  channel?: MessagingChannel | null;
  tab?: AiAssistantTab;
  agent?: string | null;
  step?: 1 | 2 | 3 | 4 | null;
  goal?: string | null;
  q?: string | null;
  setup?: boolean;
  edit?: boolean;
  analytics?: boolean;
};

export function isAiAssistantTab(value: string): value is AiAssistantTab {
  return (AI_ASSISTANT_TABS as readonly string[]).includes(value);
}

export function parseMessagingChannel(
  value: string | undefined | null,
): MessagingChannel | null {
  if (!value) {
    return null;
  }

  return isMessagingIntegrationChannel(value as IntegrationChannelId)
    ? (value as MessagingChannel)
    : null;
}

export function buildAiAssistantHref(state: AiAssistantUrlState = {}): string {
  const params = new URLSearchParams();

  if (state.channel) {
    params.set("channel", state.channel);
  }

  if (state.tab && state.tab !== "agents") {
    params.set("tab", state.tab);
  }

  if (state.agent) {
    params.set("agent", state.agent);
  }

  if (state.step && state.step !== 1) {
    params.set("step", String(state.step));
  }

  if (state.goal?.trim()) {
    params.set("goal", state.goal.trim());
  }

  if (state.q?.trim()) {
    params.set("q", state.q.trim());
  }

  if (state.setup) {
    params.set("setup", "1");
  }

  if (state.edit) {
    params.set("edit", "1");
  }

  if (state.analytics) {
    params.set("analytics", "1");
  }

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.aiAssistant}?${query}`
    : DASHBOARD_ROUTES.aiAssistant;
}

function parseCreateWizardStep(
  value: string | undefined,
  isNewAgent: boolean,
): 1 | 2 | 3 | 4 {
  if (!isNewAgent) {
    return 1;
  }

  const parsed = Number(value);

  if (parsed === 2 || parsed === 3 || parsed === 4) {
    return parsed;
  }

  return 1;
}

export function parseAiAssistantSearchParams(input: {
  channel?: string;
  tab?: string;
  agent?: string;
  step?: string;
  goal?: string;
  q?: string;
  setup?: string;
  edit?: string;
  analytics?: string;
}): {
  activeChannel: MessagingChannel | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  isNewAgent: boolean;
  createWizardStep: 1 | 2 | 3 | 4;
  createWizardGoal: string | null;
  isEditingAgent: boolean;
  isViewingAnalytics: boolean;
  searchQuery: string;
  showSetupBanner: boolean;
} {
  const activeTab =
    input.tab && isAiAssistantTab(input.tab) ? input.tab : "agents";
  const isNewAgent = input.agent === "new";
  const activeAgentId =
    input.agent && input.agent !== "new" ? input.agent : null;
  let createWizardStep = parseCreateWizardStep(input.step, isNewAgent);
  const rawGoal = isNewAgent && input.goal?.trim() ? input.goal.trim() : null;
  const createWizardGoal =
    rawGoal && isAgentWizardGoalId(rawGoal) ? rawGoal : null;

  if (createWizardStep > 1 && !createWizardGoal) {
    createWizardStep = 1;
  }

  return {
    activeChannel: parseMessagingChannel(input.channel),
    activeTab,
    activeAgentId,
    isNewAgent,
    createWizardStep,
    createWizardGoal,
    searchQuery: input.q?.trim() ?? "",
    showSetupBanner: input.setup === "1",
    isEditingAgent: input.edit === "1" && input.analytics !== "1",
    isViewingAnalytics: input.analytics === "1",
  };
}
