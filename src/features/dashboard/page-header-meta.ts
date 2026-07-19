import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  OVERVIEW_MESSAGES,
} from "@/features/dashboard/constants";
import { INTEGRATIONS_MESSAGES } from "@/features/integrations";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import { ONBOARDING_MESSAGES } from "@/features/onboarding/constants";
import { SUBSCRIPTION_MESSAGES } from "@/features/subscription/constants";
import {
  ACCOUNT_SETTINGS_MESSAGES,
  BUSINESS_PROFILE_MESSAGES,
  SETTINGS_MESSAGES,
} from "@/features/settings/constants";
import { TEAM_MESSAGES } from "@/features/team/constants";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { ORDERS_MESSAGES } from "@/features/orders/constants";

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
    pathname === DASHBOARD_ROUTES.orders ||
    pathname.startsWith(`${DASHBOARD_ROUTES.orders}/`)
  ) {
    return {
      title: ORDERS_MESSAGES.pageTitle,
      description: ORDERS_MESSAGES.pageSubtitle,
    };
  }

  if (
    pathname === DASHBOARD_ROUTES.voice ||
    pathname.startsWith(`${DASHBOARD_ROUTES.voice}/`)
  ) {
    return {
      title: VOICE_MESSAGES.inboxTabLabel,
      description: VOICE_MESSAGES.inboxEmptyDescription,
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
      title: AI_ASSISTANT_MESSAGES.singleAgentTitle,
      description: AI_ASSISTANT_MESSAGES.pageSubtitle,
    };
  }

  if (pathname === DASHBOARD_ROUTES.analytics) {
    return {
      title: ANALYTICS_MESSAGES.pageTitle,
      description: ANALYTICS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.team) {
    return {
      title: TEAM_MESSAGES.pageTitle,
      description: TEAM_MESSAGES.pageDescription,
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

  if (
    pathname === DASHBOARD_ROUTES.calendar ||
    pathname.startsWith(`${DASHBOARD_ROUTES.calendar}/`)
  ) {
    return {
      title: GOOGLE_CALENDAR_MESSAGES.pageTitle,
      description: GOOGLE_CALENDAR_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.googleCalendarIntegration) {
    return {
      title: GOOGLE_CALENDAR_MESSAGES.connectTitle,
      description: GOOGLE_CALENDAR_MESSAGES.connectDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.subscription) {
    return {
      title: SUBSCRIPTION_MESSAGES.pageTitle,
      description: SUBSCRIPTION_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.settings || pathname.startsWith(`${DASHBOARD_ROUTES.settings}/`)) {
    return {
      title: SETTINGS_MESSAGES.pageTitle,
      description: SETTINGS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.account) {
    return {
      title: ACCOUNT_SETTINGS_MESSAGES.pageTitle,
      description: ACCOUNT_SETTINGS_MESSAGES.pageDescription,
    };
  }

  if (pathname === DASHBOARD_ROUTES.profile) {
    return {
      title: BUSINESS_PROFILE_MESSAGES.pageTitle,
      description: BUSINESS_PROFILE_MESSAGES.pageDescription,
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
