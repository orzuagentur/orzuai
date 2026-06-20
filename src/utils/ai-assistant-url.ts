import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isAgentWizardGoalId } from "@/features/ai-assistant/agent-wizard-catalog";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import type { MessagingChannel } from "@/types/database.types";

export const AI_ASSISTANT_TABS = ["assistant", "agents"] as const;

export type AiAssistantTab = (typeof AI_ASSISTANT_TABS)[number];

export type AiAssistantSection = "hub" | AiAssistantTab;

const LEGACY_AI_ASSISTANT_TABS = ["channels"] as const;

export type AiAssistantUrlState = {
  section?: AiAssistantSection;
  channel?: MessagingChannel | null;
  tab?: AiAssistantTab;
  agent?: string | null;
  step?: 1 | 2 | 3 | 4 | null;
  goal?: string | null;
  q?: string | null;
  setup?: boolean;
  edit?: boolean;
  analytics?: boolean;
  assistantEdit?: boolean;
};

export function isAiAssistantTab(value: string): value is AiAssistantTab {
  return (AI_ASSISTANT_TABS as readonly string[]).includes(value);
}

function normalizeAiAssistantTab(value: string | undefined): AiAssistantTab {
  if (value && isAiAssistantTab(value)) {
    return value;
  }

  if (
    value &&
    (LEGACY_AI_ASSISTANT_TABS as readonly string[]).includes(
      value as (typeof LEGACY_AI_ASSISTANT_TABS)[number],
    )
  ) {
    return "assistant";
  }

  return "assistant";
}

function resolveSection(state: AiAssistantUrlState): AiAssistantSection {
  if (state.section) {
    return state.section;
  }

  if (state.tab) {
    return state.tab;
  }

  return "assistant";
}

export function getAiAssistantSectionPath(section: AiAssistantSection): string {
  if (section === "hub") {
    return DASHBOARD_ROUTES.aiAssistant;
  }

  if (section === "agents") {
    return DASHBOARD_ROUTES.aiAgentsSection;
  }

  return DASHBOARD_ROUTES.aiAssistantSection;
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
  const section = resolveSection(state);
  const params = new URLSearchParams();

  if (state.channel) {
    params.set("channel", state.channel);
  }

  if (state.assistantEdit) {
    params.set("assistantEdit", "1");
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
  const basePath = getAiAssistantSectionPath(section);

  return query ? `${basePath}?${query}` : basePath;
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

export function parseAiAssistantSearchParams(
  input: {
    channel?: string;
    tab?: string;
    agent?: string;
    step?: string;
    goal?: string;
    q?: string;
    setup?: string;
    edit?: string;
    analytics?: string;
    assistantEdit?: string;
  },
  options?: { section?: AiAssistantTab },
): {
  activeChannel: MessagingChannel | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  isNewAgent: boolean;
  createWizardStep: 1 | 2 | 3 | 4;
  createWizardGoal: string | null;
  isEditingAgent: boolean;
  isViewingAnalytics: boolean;
  isEditingAssistant: boolean;
  searchQuery: string;
  showSetupBanner: boolean;
} {
  const activeTab = options?.section ?? normalizeAiAssistantTab(input.tab);
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
    isEditingAssistant: input.assistantEdit === "1",
  };
}

export function buildLegacyAiAssistantRedirectHref(
  params: Record<string, string | undefined>,
): string | null {
  const tab = params.tab;

  if (tab === "channels") {
    return buildAiAssistantHref({
      section: "assistant",
      channel: parseMessagingChannel(params.channel),
    });
  }

  if (tab === "assistant" || tab === "agents") {
    const hasQueryParams = Object.entries(params).some(
      ([key, value]) => key !== "tab" && Boolean(value),
    );

    if (!hasQueryParams) {
      return getAiAssistantSectionPath(tab);
    }

    return buildAiAssistantHref({
      section: tab,
      channel: parseMessagingChannel(params.channel),
      agent: params.agent ?? null,
      step: params.step ? (Number(params.step) as 1 | 2 | 3 | 4) : null,
      goal: params.goal ?? null,
      q: params.q ?? null,
      setup: params.setup === "1",
      edit: params.edit === "1",
      analytics: params.analytics === "1",
      assistantEdit: params.assistantEdit === "1",
    });
  }

  const hasDeepLinkParams = [
    "agent",
    "step",
    "goal",
    "q",
    "setup",
    "edit",
    "analytics",
    "assistantEdit",
    "channel",
  ].some((key) => Boolean(params[key]));

  if (!hasDeepLinkParams) {
    return null;
  }

  if (params.agent || params.q || params.edit || params.analytics || params.setup) {
    return buildAiAssistantHref({
      section: "agents",
      channel: parseMessagingChannel(params.channel),
      agent: params.agent ?? null,
      step: params.step ? (Number(params.step) as 1 | 2 | 3 | 4) : null,
      goal: params.goal ?? null,
      q: params.q ?? null,
      setup: params.setup === "1",
      edit: params.edit === "1",
      analytics: params.analytics === "1",
    });
  }

  return buildAiAssistantHref({
    section: "assistant",
    channel: parseMessagingChannel(params.channel),
    assistantEdit: params.assistantEdit === "1",
  });
}
