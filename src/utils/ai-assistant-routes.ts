import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { AiAgentTab } from "@/types/agent-dashboard.types";

export function getAiAssistantTabPath(tab: AiAgentTab): string {
  switch (tab) {
    case "dashboard":
      return DASHBOARD_ROUTES.aiAssistant;
    case "channels":
      return DASHBOARD_ROUTES.aiAssistantChannels;
    case "knowledge":
      return DASHBOARD_ROUTES.aiAssistantKnowledge;
    case "voice":
      return DASHBOARD_ROUTES.aiAssistantVoice;
    case "settings":
      return DASHBOARD_ROUTES.aiAssistantSettings;
    default:
      return DASHBOARD_ROUTES.aiAssistant;
  }
}

export function resolveAiAgentTabFromPathname(pathname: string): AiAgentTab {
  if (pathname.startsWith(DASHBOARD_ROUTES.aiAssistantChannels)) {
    return "channels";
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.aiAssistantKnowledge)) {
    return "knowledge";
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.aiAssistantVoice)) {
    return "voice";
  }

  if (pathname.startsWith(DASHBOARD_ROUTES.aiAssistantSettings)) {
    return "settings";
  }

  return "dashboard";
}

export function isAiAssistantKnowledgeSubPath(pathname: string): boolean {
  return (
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantKnowledgeImport) ||
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantKnowledgeWebsite) ||
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantKnowledgeGenerate)
  );
}
