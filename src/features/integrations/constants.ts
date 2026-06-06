import type { ComponentType, SVGProps } from "react";

import {
  InstagramIcon,
  TelegramIcon,
  VoiceIcon,
  WebsiteFormsIcon,
  WhatsAppIcon,
} from "@/components/icons/channel-brand-icons";
import { DASHBOARD_ROUTES } from "@/constants/routes";

export type ChannelIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const MESSAGING_INTEGRATION_CHANNELS = [
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
] as const;

export const INTEGRATION_CHANNELS = [
  ...MESSAGING_INTEGRATION_CHANNELS,
  "voice",
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

export const INTEGRATION_SECTIONS = ["activate", "contacts"] as const;

export const INTEGRATION_WIZARD_STEPS = [
  { id: "connect", label: "Connect" },
  { id: "configure-ai", label: "Configure AI" },
  { id: "test", label: "Test" },
  { id: "go-live", label: "Go live" },
] as const;

export type IntegrationWizardStepId =
  (typeof INTEGRATION_WIZARD_STEPS)[number]["id"];

export const LEGACY_INTEGRATION_WORKSPACE_SECTIONS = [
  "ai-assistant",
  "analytics",
] as const;

export type LegacyIntegrationWorkspaceSectionId =
  (typeof LEGACY_INTEGRATION_WORKSPACE_SECTIONS)[number];

export type IntegrationSectionId = (typeof INTEGRATION_SECTIONS)[number];

export const DEFAULT_INTEGRATION_CHANNEL: IntegrationChannelId = "whatsapp";
export const DEFAULT_INTEGRATION_SECTION: IntegrationSectionId = "activate";

export type IntegrationChannelConfig = {
  id: IntegrationChannelId;
  label: string;
  description: string;
  icon: ChannelIconComponent;
  available: boolean;
};

export const INTEGRATION_CHANNEL_LIST: IntegrationChannelConfig[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp Business Cloud API",
    icon: WhatsAppIcon,
    available: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Instagram Direct via Meta",
    icon: InstagramIcon,
    available: true,
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Telegram Bot API",
    icon: TelegramIcon,
    available: true,
  },
  {
    id: "website_forms",
    label: "Website Forms",
    description: "Leads from any website or CMS",
    icon: WebsiteFormsIcon,
    available: true,
  },
  {
    id: "voice",
    label: "AI Voice",
    description: "AI calls leads after website forms",
    icon: VoiceIcon,
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
];

export const INTEGRATIONS_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription:
    "Connect messaging channels and manage activation, contacts, AI, and analytics per product.",
  indexDescription:
    "Your connected channels. Add more from the Marketplace.",
  indexEmptyTitle: "No active integrations yet",
  indexEmptyDescription:
    "Browse the Marketplace to connect WhatsApp, Telegram, Website Forms, AI Voice, and more.",
  marketplaceTitle: "Integrations Marketplace",
  marketplaceDescription:
    "Browse all channels. Activated ones are marked with a green badge.",
  backToIntegrations: "My integrations",
  backToMarketplace: "Marketplace",
  configureChannel: "Open settings",
  connectChannel: "Connect",
  sectionSettings: "Settings",
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
  statusActivated: "Activated",
  statusPending: "Pending",
  statusDisconnected: "Not connected",
  statusComingSoon: "Coming soon",
  channelContextPrefix: "Viewing workspace for",
  webhookReceiving: "Receiving messages",
  webhookWaiting: "Waiting for first message",
  webhookDisconnected: "Not connected",
  wizardTitle: "Setup flow",
  wizardDescription:
    "Connect your channel, configure AI, test a reply, then open the inbox.",
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

export function isLegacyIntegrationWorkspaceSection(
  value: string | null | undefined,
): value is LegacyIntegrationWorkspaceSectionId {
  return (
    value !== null &&
    value !== undefined &&
    LEGACY_INTEGRATION_WORKSPACE_SECTIONS.includes(
      value as LegacyIntegrationWorkspaceSectionId,
    )
  );
}
