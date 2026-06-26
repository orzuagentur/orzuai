import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import type { MessagingChannel } from "@/types/database.types";

export const AI_ASSISTANT_TABS = ["assistant"] as const;

export type AiAssistantTab = (typeof AI_ASSISTANT_TABS)[number];

export type AiAssistantSection = "hub" | AiAssistantTab;

const LEGACY_AI_ASSISTANT_TABS = ["channels", "agents"] as const;

export type AiAssistantUrlState = {
  section?: AiAssistantSection;
  channel?: MessagingChannel | null;
  tab?: AiAssistantTab;
  q?: string | null;
  setup?: boolean;
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

  if (state.q?.trim()) {
    params.set("q", state.q.trim());
  }

  if (state.setup) {
    params.set("setup", "1");
  }

  const query = params.toString();
  const basePath = getAiAssistantSectionPath(section);

  return query ? `${basePath}?${query}` : basePath;
}

export function parseAiAssistantSearchParams(
  input: {
    channel?: string;
    tab?: string;
    q?: string;
    setup?: string;
    assistantEdit?: string;
    agent?: string;
    step?: string;
    goal?: string;
    edit?: string;
    analytics?: string;
  },
  options?: { section?: AiAssistantTab },
): {
  activeChannel: MessagingChannel | null;
  activeTab: AiAssistantTab;
  isEditingAssistant: boolean;
  searchQuery: string;
  showSetupBanner: boolean;
} {
  const activeTab = options?.section ?? normalizeAiAssistantTab(input.tab);

  return {
    activeChannel: parseMessagingChannel(input.channel),
    activeTab,
    searchQuery: input.q?.trim() ?? "",
    showSetupBanner: input.setup === "1",
    isEditingAssistant: input.assistantEdit === "1",
  };
}

export function buildLegacyAiAssistantRedirectHref(
  params: Record<string, string | undefined>,
): string | null {
  const tab = params.tab;

  if (
    tab === "channels" ||
    tab === "assistant" ||
    tab === "agents"
  ) {
    return buildAiAssistantHref({
      section: "assistant",
      channel: parseMessagingChannel(params.channel),
      assistantEdit: params.assistantEdit === "1",
      q: params.q ?? null,
      setup: params.setup === "1",
    });
  }

  const hasDeepLinkParams = [
    "q",
    "setup",
    "assistantEdit",
    "channel",
    "agent",
    "step",
    "goal",
    "edit",
    "analytics",
  ].some((key) => Boolean(params[key]));

  if (!hasDeepLinkParams) {
    return null;
  }

  return buildAiAssistantHref({
    section: "assistant",
    channel: parseMessagingChannel(params.channel),
    assistantEdit: params.assistantEdit === "1",
    q: params.q ?? null,
    setup: params.setup === "1",
  });
}
