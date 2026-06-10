import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import type { MessagingChannel } from "@/types/database.types";

export const AI_ASSISTANT_TABS = ["agents", "automation", "channels"] as const;

export type AiAssistantTab = (typeof AI_ASSISTANT_TABS)[number];

export type AiAssistantUrlState = {
  channel?: MessagingChannel | null;
  tab?: AiAssistantTab;
  agent?: string | null;
  pick?: string | null;
  q?: string | null;
  setup?: boolean;
  edit?: boolean;
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

  if (state.pick?.trim()) {
    params.set("pick", state.pick.trim());
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

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.aiAssistant}?${query}`
    : DASHBOARD_ROUTES.aiAssistant;
}

export function parseAiAssistantSearchParams(input: {
  channel?: string;
  tab?: string;
  agent?: string;
  pick?: string;
  q?: string;
  setup?: string;
  edit?: string;
}): {
  activeChannel: MessagingChannel | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  isNewAgent: boolean;
  activeAgentPick: string | null;
  isEditingAgent: boolean;
  searchQuery: string;
  showSetupBanner: boolean;
} {
  const activeTab =
    input.tab && isAiAssistantTab(input.tab) ? input.tab : "agents";
  const isNewAgent = input.agent === "new";
  const activeAgentId =
    input.agent && input.agent !== "new" ? input.agent : null;
  const activeAgentPick =
    isNewAgent && input.pick?.trim() ? input.pick.trim() : null;

  return {
    activeChannel: parseMessagingChannel(input.channel),
    activeTab,
    activeAgentId,
    isNewAgent,
    activeAgentPick,
    searchQuery: input.q?.trim() ?? "",
    showSetupBanner: input.setup === "1",
    isEditingAgent: input.edit === "1",
  };
}
