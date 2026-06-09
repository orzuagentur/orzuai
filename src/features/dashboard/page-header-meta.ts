import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  OVERVIEW_MESSAGES,
  SETTINGS_MESSAGES,
} from "@/features/dashboard/constants";
import { INTEGRATIONS_MESSAGES } from "@/features/integrations";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { ONBOARDING_MESSAGES } from "@/features/onboarding/constants";
import { SUBSCRIPTION_MESSAGES } from "@/features/subscription/constants";

export type DashboardPageHeaderMeta = {
  title: string;
  description: string;
};

export function getDashboardPageHeaderMeta(
  pathname: string,
): DashboardPageHeaderMeta | null {
  if (pathname === DASHBOARD_ROUTES.overview) {
    return {
      title: OVERVIEW_MESSAGES.title,
      description: OVERVIEW_MESSAGES.description,
    };
  }

  if (
    pathname === DASHBOARD_ROUTES.chats ||
    pathname.startsWith(`${DASHBOARD_ROUTES.chats}/`)
  ) {
    return {
      title: CHAT_MESSAGES.pageTitle,
      description: CHAT_MESSAGES.inboxSubtitle,
    };
  }

  if (pathname === DASHBOARD_ROUTES.contacts) {
    return {
      title: CONTACTS_MESSAGES.pageTitle,
      description: CONTACTS_MESSAGES.pageSubtitle,
    };
  }

  if (pathname === DASHBOARD_ROUTES.aiAssistant) {
    return {
      title: AI_ASSISTANT_MESSAGES.pageTitle,
      description: AI_ASSISTANT_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.automations) {
    return {
      title: AUTOMATIONS_MESSAGES.pageTitle,
      description: AUTOMATIONS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.analytics) {
    return {
      title: ANALYTICS_MESSAGES.pageTitle,
      description: ANALYTICS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.marketplace) {
    return {
      title: INTEGRATIONS_MESSAGES.marketplaceTitle,
      description: INTEGRATIONS_MESSAGES.marketplaceDescription,
    };
  }

  if (
    pathname === DASHBOARD_ROUTES.integrations ||
    pathname.startsWith(`${DASHBOARD_ROUTES.integrations}/`)
  ) {
    return {
      title: INTEGRATIONS_MESSAGES.pageTitle,
      description: INTEGRATIONS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.knowledgeBase) {
    return {
      title: KNOWLEDGE_MESSAGES.pageTitle,
      description: KNOWLEDGE_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.subscription) {
    return {
      title: SUBSCRIPTION_MESSAGES.pageTitle,
      description: SUBSCRIPTION_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.settings) {
    return {
      title: SETTINGS_MESSAGES.pageTitle,
      description: SETTINGS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.onboarding) {
    return {
      title: ONBOARDING_MESSAGES.pageTitle,
      description: ONBOARDING_MESSAGES.pageDescription,
    };
  }

  return null;
}
