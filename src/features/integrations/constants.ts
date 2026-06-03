import type { LucideIcon } from "lucide-react";
import { BookOpen, Camera, Globe, MessageCircle, Send } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export const MESSAGING_INTEGRATION_CHANNELS = [
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
] as const;

export const INTEGRATION_CHANNELS = [
  ...MESSAGING_INTEGRATION_CHANNELS,
  "website_knowledge",
] as const;

export type MessagingIntegrationChannelId =
  (typeof MESSAGING_INTEGRATION_CHANNELS)[number];

export type IntegrationChannelId = (typeof INTEGRATION_CHANNELS)[number];

export function isMessagingIntegrationChannel(
  channel: IntegrationChannelId,
): channel is MessagingIntegrationChannelId {
  return (MESSAGING_INTEGRATION_CHANNELS as readonly string[]).includes(channel);
}

export const INTEGRATION_SECTIONS = [
  "activate",
  "contacts",
  "ai-assistant",
  "analytics",
] as const;

export type IntegrationSectionId = (typeof INTEGRATION_SECTIONS)[number];

export const DEFAULT_INTEGRATION_CHANNEL: IntegrationChannelId = "whatsapp";
export const DEFAULT_INTEGRATION_SECTION: IntegrationSectionId = "activate";

export type IntegrationChannelConfig = {
  id: IntegrationChannelId;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
};

export const INTEGRATION_CHANNEL_LIST: IntegrationChannelConfig[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp Business Cloud API",
    icon: MessageCircle,
    available: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Instagram Direct via Meta",
    icon: Camera,
    available: true,
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Telegram Bot API",
    icon: Send,
    available: true,
  },
  {
    id: "website_forms",
    label: "Website Forms",
    description: "Leads from any website or CMS",
    icon: Globe,
    available: true,
  },
  {
    id: "website_knowledge",
    label: "Website Knowledge",
    description: "Sync site content into AI knowledge",
    icon: BookOpen,
    available: true,
  },
];

export const INTEGRATION_SECTION_LIST: Array<{
  id: IntegrationSectionId;
  label: string;
  href: (channel: IntegrationChannelId) => string;
}> = [
  {
    id: "activate",
    label: "Activate",
    href: (channel) =>
      `${DASHBOARD_ROUTES.integrations}/${channel}?section=activate`,
  },
  {
    id: "contacts",
    label: "Contacts",
    href: (channel) =>
      `${DASHBOARD_ROUTES.integrations}/${channel}?section=contacts`,
  },
  {
    id: "ai-assistant",
    label: "AI Assistant",
    href: (channel) =>
      `${DASHBOARD_ROUTES.integrations}/${channel}?section=ai-assistant`,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: (channel) =>
      `${DASHBOARD_ROUTES.integrations}/${channel}?section=analytics`,
  },
];

export const INTEGRATIONS_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription:
    "Connect messaging channels and manage activation, contacts, AI, and analytics per product.",
  channelsTitle: "Channels",
  selectChannel: "Select a channel to configure.",
  comingSoonTitle: "Coming in Version 2",
  comingSoonDescription:
    "This channel is prepared in the integrations hub. API connection will be enabled in the next release phase.",
  sectionActivate: "Activate",
  sectionContacts: "Contacts",
  sectionAiAssistant: "AI Assistant",
  sectionAnalytics: "Analytics",
  contactsHint: "Contacts received on this channel.",
  aiHint: "Enable or disable AI auto-replies for this channel.",
  analyticsHint: "Messages, contacts, and AI metrics for this channel.",
  openGlobalContacts: "Open Contacts",
  openGlobalAi: "Open AI Assistant",
  openGlobalAnalytics: "Open Analytics",
  activateFirstTitle: "Connect this channel first",
  activateFirstDescription:
    "Open Activate and complete the connection before using Contacts, AI Assistant, or Analytics for this channel.",
  goToActivate: "Go to Activate",
  connectedQuickLinks: "Workspace",
  statusConnected: "Connected",
  statusPending: "Pending",
  statusDisconnected: "Not connected",
  statusComingSoon: "Coming soon",
  channelContextPrefix: "Viewing workspace for",
} as const;

export function buildChannelWorkspaceHref(
  channel: IntegrationChannelId,
  workspace: "contacts" | "ai-assistant" | "analytics",
): string {
  const base =
    workspace === "contacts"
      ? DASHBOARD_ROUTES.contacts
      : workspace === "ai-assistant"
        ? DASHBOARD_ROUTES.aiAssistant
        : DASHBOARD_ROUTES.analytics;

  return `${base}?channel=${channel}`;
}

export function buildIntegrationActivateHref(
  channel: IntegrationChannelId,
): string {
  return `${DASHBOARD_ROUTES.integrations}/${channel}?section=activate`;
}

export function isIntegrationChannelId(
  value: string,
): value is IntegrationChannelId {
  return INTEGRATION_CHANNELS.includes(value as IntegrationChannelId);
}

export function isIntegrationSectionId(
  value: string | null | undefined,
): value is IntegrationSectionId {
  return (
    value !== null &&
    value !== undefined &&
    INTEGRATION_SECTIONS.includes(value as IntegrationSectionId)
  );
}
